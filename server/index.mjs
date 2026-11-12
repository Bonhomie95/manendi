// Manendi API — Node stdlib http + MongoDB. Set MONGODB_URI to move from local to Atlas.
// Local-first: people, dates, trips and documents stay on the phone. The API watches USCIS cases, serves the policy
// radar and checks Manendi Plus. A device proves itself with a random key it made itself. Signing in (Google or Apple)
// is optional: the account keeps a backup of the household (never document photos) and the Plus purchase ID.
import http from 'node:http';
import { createHash } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { LIMITS, isPlus, lapsed, planView, revenueCat, storePlan } from './billing.mjs';
import { identity } from './identity.mjs';
import { pages } from './pages.mjs';
import { fetchRadar } from './radar.mjs';
import { RECEIPT, cleanReceipt, uscis } from './uscis.mjs';

const { MONGODB_URI = 'mongodb://127.0.0.1:27017', MONGODB_DB = 'manendi', PORT = '4100', HOST = '127.0.0.1', REVENUECAT_SECRET_KEY, NODE_ENV } = process.env;
// Shown on the privacy, terms, support and erase pages the store listings link to.
const { SUPPORT_EMAIL = 'support@example.com', LEGAL_NAME = 'Manendi (dev)', LEGAL_ADDRESS = '' } = process.env;
const prod = NODE_ENV === 'production';
const missing = ['MONGODB_URI', 'SUPPORT_EMAIL', 'LEGAL_NAME'].filter((k) => !process.env[k]);
if (prod && missing.length) throw new Error(`Set ${missing.join(', ')} — production needs the database and the store pages' contact details`);
if (prod && process.env.USCIS_MOCK === '1') throw new Error('USCIS_MOCK serves fake case statuses — never in production');
// Test purchases (no real charge) are on outside production unless BILLING_DEV=false.
const BILLING_DEV = process.env.BILLING_DEV ? process.env.BILLING_DEV === 'true' : !prod;
// USCIS issues sandbox keys first and production keys only after a demo (booked into 2027). The sandbox only knows test
// cases, so in production sandbox keys never answer users (they get manual mode). Instead the API drills the sandbox
// hourly, one real test case and one bad receipt, because USCIS wants 5+ consecutive days of 200 and 4xx traffic before
// it grants production. Set the production USCIS_BASE + keys when they arrive and cases go live for everyone.
const { USCIS_BASE = 'https://api-int.uscis.gov', USCIS_CLIENT_ID, USCIS_CLIENT_SECRET } = process.env;
const sandboxInProd = prod && USCIS_BASE.includes('api-int.');
const cases = uscis({ base: USCIS_BASE, mock: process.env.USCIS_MOCK === '1', ...(sandboxInProd ? {} : { id: USCIS_CLIENT_ID, secret: USCIS_CLIENT_SECRET }) });
const drill = sandboxInProd && USCIS_CLIENT_ID && USCIS_CLIENT_SECRET ? uscis({ base: USCIS_BASE, id: USCIS_CLIENT_ID, secret: USCIS_CLIENT_SECRET }) : null;
const practice = () => Promise.allSettled([drill.status('EAC9999103402'), drill.status('EAC0000000000')])
  .then((r) => console.log('uscis sandbox drill:', r.map((x) => (x.status === 'fulfilled' ? 200 : x.reason.status)).join(' ')));
if (drill) { setTimeout(practice, 60e3).unref(); setInterval(practice, 3600e3).unref(); }
const rcSubscriber = revenueCat(REVENUECAT_SECRET_KEY);
// Public client IDs (they ship inside the app): Google's web client (Android tokens) and iOS client, Apple's bundle ID.
const {
  GOOGLE_CLIENT_IDS = '430359710145-8i6h04mv3opb8ss3rm9e7hjvgliksge0.apps.googleusercontent.com,430359710145-liuagfibcq8k7jfg6se47e46jmmrb1gm.apps.googleusercontent.com',
  APPLE_BUNDLE_ID = 'dev.bonhomieinc.manendi',
} = process.env;
const verifyToken = identity({ audiences: { google: GOOGLE_CLIENT_IDS.split(',').filter(Boolean), apple: [APPLE_BUNDLE_ID] } });
const client = new MongoClient(MONGODB_URI);
const db = client.db(MONGODB_DB);
const [devices, watches, cache, attempts, accounts] = ['devices', 'watches', 'cache', 'attempts', 'accounts'].map((n) => db.collection(n));

// ---------- helpers ----------
const fail = (status, error) => Object.assign(new Error(error), { status });
const sha = (s) => createHash('sha256').update(s).digest('hex');
const wid = (deviceId, receipt) => `${deviceId}:${receipt}`;
const accountView = (a) => (a ? { provider: a.provider, email: a.email ?? null, name: a.name ?? null, backupAt: a.backup?.at ?? null } : null);
const watchView = (w) => ({
  receipt: w.receipt, label: w.label ?? '', form: w.form ?? null, status: w.status ?? null, detail: w.detail ?? '',
  modified: w.modified ?? null, history: w.history ?? [], checkedAt: w.checkedAt ?? null, error: w.error ?? null,
});

// RevenueCat is the source of truth for store plans; dev plans are ours.
async function syncStore(d) {
  if (!REVENUECAT_SECRET_KEY || !d.appUserId) return d;
  const plan = storePlan(await rcSubscriber(d.appUserId).catch(() => { throw fail(503, 'Couldn’t reach the store — try again'); }));
  if (plan) await devices.updateOne({ _id: d._id }, { $set: { plan } });
  else if (d.plan?.source === 'store') await devices.updateOne({ _id: d._id }, { $unset: { plan: '' } });
  return devices.findOne({ _id: d._id });
}
// ponytail: renewals are picked up lazily once the stored expiry passes; add RevenueCat webhooks if refunds must cut access instantly
const fresh = async (d) => (lapsed(d) ? syncStore(d).catch(() => d) : d);

// Request limits, counted in Mongo so they survive restarts and extra instances.
async function guard(key, max) {
  const a = await attempts.findOneAndUpdate({ _id: key }, { $inc: { n: 1 }, $setOnInsert: { expiresAt: new Date(Date.now() + 15 * 60e3) } }, { upsert: true, returnDocument: 'after' });
  if (a.n > max) throw fail(429, 'That’s a lot of checks. Try again in a few minutes.');
}

async function push(deviceId, title, body) {
  const d = await devices.findOne({ _id: deviceId });
  if (!d?.pushToken || !isPlus(d)) return; // change alerts are part of Plus
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ to: d.pushToken, title, body, sound: 'default', data: { path: '/cases' } }),
  }).catch(() => {});
}

/** Asks USCIS for the latest status, keeps a history of every change, and (in the sweep) alerts on changes. */
async function check(w, alert = false) {
  const c = await cases.status(w.receipt);
  const changed = !!w.status && c.status !== w.status;
  const ours = changed ? [{ status: w.status, date: w.modified }, ...(w.history ?? [])].slice(0, 60) : w.history ?? [];
  const set = { form: c.form, status: c.status, detail: c.detail, modified: c.modified, history: c.history.length ? c.history : ours, checkedAt: new Date() };
  await watches.updateOne({ _id: w._id }, { $set: set, $unset: { error: '' } });
  if (alert && changed) await push(w.deviceId, `Case update · ${w.label || w.receipt}`, c.status);
  return { ...w, ...set, error: null };
}

// ---------- routes ----------
const RAW = Symbol('raw'); // { [RAW]: [contentType, body] } for non-JSON responses
const routes = [];
const on = (method, path, fn, open = false) =>
  routes.push({ method, re: new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`), fn, open });

on('GET', '/health', async () => ({ ok: true, live: cases.live, mock: cases.mock }), true);
for (const [slug, html] of Object.entries(pages({ supportEmail: SUPPORT_EMAIL, legalName: LEGAL_NAME, address: LEGAL_ADDRESS }))) {
  on('GET', `/${slug}`, async () => ({ [RAW]: ['text/html; charset=utf-8', html] }), true);
}

// Public data, so no device key: loading the radar tells us nothing about anyone.
on('GET', '/radar', async () => {
  const c = await cache.findOne({ _id: 'radar' });
  if (c && Date.now() - c.at < 3600e3) return { items: c.items, at: c.at };
  try {
    const items = await fetchRadar(new Date(Date.now() - 270 * 864e5).toISOString().slice(0, 10));
    await cache.updateOne({ _id: 'radar' }, { $set: { items, at: Date.now() } }, { upsert: true });
    return { items, at: Date.now() };
  } catch (e) {
    console.error('radar', e.message);
    if (c) return { items: c.items, at: c.at, stale: true };
    throw fail(503, 'The policy radar is catching up. Try again in a minute.');
  }
}, true);

on('POST', '/device', async ({ body, device }) => {
  const set = {};
  if (typeof body.appUserId === 'string' && /^[\w-]{8,64}$/.test(body.appUserId)) set.appUserId = body.appUserId;
  if (body.pushToken === null || (typeof body.pushToken === 'string' && /^Expo(nent)?PushToken\[[\w-]+\]$/.test(body.pushToken))) set.pushToken = body.pushToken;
  if (Object.keys(set).length) await devices.updateOne({ _id: device._id }, { $set: set });
  const d = { ...device, ...set };
  const a = d.accountId ? await accounts.findOneAndUpdate({ _id: d.accountId }, { $set: { lastSeen: new Date() } }, { returnDocument: 'after' }) : null;
  return {
    ...planView(await (set.appUserId && !d.plan ? syncStore(d).catch(() => d) : fresh(d))),
    testMode: BILLING_DEV && !REVENUECAT_SECRET_KEY, account: accountView(a),
  };
});

// "Erase my server data": the device record, every watched case and, if this phone is signed in, the account and its
// backup, immediately.
on('DELETE', '/device', async ({ device }) => {
  if (device.accountId) await removeAccount(device.accountId);
  await Promise.all([devices.deleteOne({ _id: device._id }), watches.deleteMany({ deviceId: device._id })]);
});

// ---------- accounts (optional) ----------
async function accountOf(device) {
  const a = device.accountId && (await accounts.findOne({ _id: device.accountId }));
  if (!a) throw fail(401, 'Sign in first');
  return a;
}
async function removeAccount(_id) {
  await Promise.all([accounts.deleteOne({ _id }), devices.updateMany({ accountId: _id }, { $unset: { accountId: '' } })]);
}

// Sign in with the ID token from Google's or Apple's sheet. A new account adopts this phone's Plus purchase ID; a phone
// joining an existing account takes the account's, so Plus follows the person. The backup comes back for the app to restore.
on('POST', '/account', async ({ body, device }) => {
  await guard(`signin:${device._id}`, 20);
  const provider = ['google', 'apple'].includes(body.provider) ? body.provider : null;
  if (!provider) throw fail(400, 'Unknown sign-in');
  const who = await verifyToken(provider, body.idToken);
  const name = who.name ?? (typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : null);
  const userId = typeof body.userId === 'string' && /^[\w-]{8,64}$/.test(body.userId) ? body.userId : device.appUserId ?? null;
  const a = await accounts.findOneAndUpdate({ _id: `${provider}:${who.sub}` }, {
    $set: { lastSeen: new Date(), ...(who.email && { email: who.email }), ...(name && { name }) },
    $setOnInsert: { provider, userId, createdAt: new Date() },
  }, { upsert: true, returnDocument: 'after' });
  const set = { accountId: a._id, ...(a.userId && { appUserId: a.userId }) };
  await devices.updateOne({ _id: device._id }, { $set: set });
  const d = { ...device, ...set };
  const plan = await (a.userId && a.userId !== device.appUserId ? syncStore(d).catch(() => d) : fresh(d));
  return { account: accountView(a), userId: a.userId ?? null, backup: a.backup ?? null, plan: planView(plan) };
});

// The household as the phone has it: people (with their dates, jobs and trips) and case links. Never document photos.
on('PUT', '/account/backup', async ({ body, device }) => {
  const a = await accountOf(device);
  await guard(`backup:${device._id}`, 300);
  if (!Array.isArray(body.people) || !Array.isArray(body.cases)) throw fail(400, 'That backup looks incomplete');
  const backup = { people: body.people, cases: body.cases, at: new Date() };
  await accounts.updateOne({ _id: a._id }, { $set: { backup, lastSeen: new Date() } });
  return { at: backup.at };
});

// ponytail: signing out unlinks this phone but keeps its Plus purchase ID, so Plus stays where it was bought; give the
// phone a fresh ID here if shared phones must lose Plus on sign-out.
on('DELETE', '/account/session', async ({ device }) => {
  await devices.updateOne({ _id: device._id }, { $unset: { accountId: '' } });
});

// Delete the account: its email, name and backup, unlinked from every phone. Store subscriptions bill until cancelled.
on('DELETE', '/account', async ({ device }) => removeAccount((await accountOf(device))._id));

on('POST', '/billing/sync', async ({ device }) => planView(await syncStore(device)));

// Simulator/dev purchases: no store, no charge. Disabled in production.
on('POST', '/billing/dev-grant', async ({ body, device }) => {
  if (!BILLING_DEV) throw fail(404, 'Test purchases are off on this server — use a store build to buy.');
  if (body.period === 'off') await devices.updateOne({ _id: device._id }, { $unset: { plan: '' } });
  else await devices.updateOne({ _id: device._id }, { $set: { plan: { source: 'dev', expiresAt: new Date(Date.now() + (body.period === 'monthly' ? 31 : 366) * 864e5) } } });
  return planView(await devices.findOne({ _id: device._id }));
});

on('GET', '/watch', async ({ device }) => ({
  live: cases.live, mock: cases.mock,
  watches: (await watches.find({ deviceId: device._id }).sort({ createdAt: 1 }).toArray()).map(watchView),
}));

on('POST', '/watch', async ({ body, device }) => {
  const receipt = cleanReceipt(body.receipt);
  if (!RECEIPT.test(receipt)) throw fail(400, 'Receipt numbers are 3 letters and 10 digits, like IOE0912345678');
  const d = await fresh(device);
  const _id = wid(d._id, receipt);
  const limit = LIMITS[isPlus(d) ? 'plus' : 'free'].watches;
  if (!(await watches.findOne({ _id })) && (await watches.countDocuments({ deviceId: d._id })) >= limit) {
    throw fail(402, isPlus(d) ? `Up to ${limit} cases for now` : 'Watching more than one case is part of Manendi Plus');
  }
  await watches.updateOne({ _id }, {
    $set: { label: typeof body.label === 'string' ? body.label.trim().slice(0, 60) : '' },
    $setOnInsert: { deviceId: d._id, receipt, history: [], createdAt: new Date() },
  }, { upsert: true });
  const w = await watches.findOne({ _id });
  if (!cases.live) return watchView(w);
  try { return watchView(await check(w)); } catch (e) {
    if (e.status === 404) { await watches.deleteOne({ _id }); throw e; } // not a real receipt: don't keep it
    return watchView({ ...w, error: e.message });
  }
});

on('POST', '/watch/:receipt/refresh', async ({ params: [r], device }) => {
  const w = await watches.findOne({ _id: wid(device._id, cleanReceipt(r)) });
  if (!w) throw fail(404, 'Not found');
  await guard(`refresh:${device._id}`, 12);
  return watchView(await check(w));
});

on('DELETE', '/watch/:receipt', async ({ params: [r], device }) => {
  await watches.deleteOne({ _id: wid(device._id, cleanReceipt(r)) });
});

// ---------- server ----------
async function readJson(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 512_000) throw fail(413, 'Too large'); } // a household backup fits
  if (!raw) return {};
  let body;
  try { body = JSON.parse(raw); } catch { throw fail(400, 'Bad JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'Bad JSON');
  return body;
}

// A device is whoever holds its key; we only ever store the key's hash. First sight creates the record.
async function auth(req) {
  const key = req.headers.authorization?.replace(/^Bearer /, '');
  if (!key || key.length < 32 || key.length > 128) throw fail(401, 'Missing device key');
  const device = await devices.findOneAndUpdate({ _id: sha(key) },
    { $set: { lastSeen: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true, returnDocument: 'after' });
  return { device };
}

// Every hour: re-check cases not checked in 12 hours, alert on changes, and drop devices idle for a year.
async function sweep() {
  if (cases.live) {
    const due = await watches.find({ $or: [{ checkedAt: { $lt: new Date(Date.now() - 12 * 3600e3) } }, { checkedAt: null }] }).limit(300).toArray();
    for (const w of due) {
      await check(w, true).catch((e) => watches.updateOne({ _id: w._id }, { $set: { checkedAt: new Date(), error: e.message } }));
      await new Promise((r) => setTimeout(r, 300)); // USCIS allows 5 requests a second
    }
  }
  const yearAgo = new Date(Date.now() - 365 * 864e5);
  const stale = (await devices.find({ lastSeen: { $lt: yearAgo } }, { projection: { _id: 1 } }).toArray()).map((d) => d._id);
  if (stale.length) await Promise.all([devices.deleteMany({ _id: { $in: stale } }), watches.deleteMany({ deviceId: { $in: stale } })]);
  await accounts.deleteMany({ lastSeen: { $lt: yearAgo } }); // a year without use: the backup goes too
}

await client.connect();
await Promise.all([
  watches.createIndex({ deviceId: 1, createdAt: 1 }),
  watches.createIndex({ checkedAt: 1 }),
  devices.createIndex({ lastSeen: 1 }),
  devices.createIndex({ accountId: 1 }, { sparse: true }),
  accounts.createIndex({ lastSeen: 1 }),
  attempts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
]);
setInterval(() => sweep().catch((e) => console.error('sweep', e)), 3600e3).unref();

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!route) throw fail(404, 'Not found');
    const ctx = {
      params: url.pathname.match(route.re).slice(1).map(decodeURIComponent),
      query: Object.fromEntries(url.searchParams),
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readJson(req) : {},
      ...(route.open ? {} : await auth(req)),
    };
    const out = (await route.fn(ctx)) ?? { ok: true };
    if (out[RAW]) { res.writeHead(200, { 'content-type': out[RAW][0] }); return res.end(out[RAW][1]); }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out));
  } catch (e) {
    if (!e.status) console.error(e);
    res.writeHead(e.status ?? 500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: e.status ? e.message : 'Something went wrong' }));
  }
}).listen(Number(PORT), HOST, () => console.log(`manendi api → http://${HOST}:${PORT} (db: ${MONGODB_DB}, cases: ${cases.mock ? 'mock' : cases.live ? 'live' : 'off'}${drill ? ' + sandbox drill' : ''})`));

// ponytail: Render's free plan sleeps after 15 idle minutes (~1 min cold start). Pinging our own public URL every 5–10
// minutes counts as traffic, so the API stays warm. KEEPALIVE_HOURS ("12-04", UTC) limits that to part of the day: a free
// service awake 24/7 uses ~744 of the workspace's 750 free hours, and Render suspends every free service when they run
// out. keepalive/ wakes it again when the window opens. Delete this once the service is on a paid instance.
const { RENDER_EXTERNAL_URL, KEEPALIVE_HOURS } = process.env;
const inWindow = (h, [a, b] = (KEEPALIVE_HOURS ?? '').split('-').map(Number)) =>
  !KEEPALIVE_HOURS || (a <= b ? h >= a && h < b : h >= a || h < b);
const warm = () => setTimeout(() => {
  if (inWindow(new Date().getUTCHours())) fetch(`${RENDER_EXTERNAL_URL}/health`).catch(() => {});
  warm();
}, (5 + Math.random() * 5) * 60_000).unref();
if (RENDER_EXTERNAL_URL) warm();
