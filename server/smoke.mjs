// End-to-end check against a running API (npm start with USCIS_MOCK=1). Usage: npm run smoke [-- http://host:port]
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4100';
const key = randomBytes(32).toString('base64url');
async function call(path, { method, body, auth = true } = {}) {
  const r = await fetch(BASE + path, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${key}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = r.headers.get('content-type') ?? '';
  return { status: r.status, data: type.includes('json') ? await r.json() : await r.text() };
}
const ok = (label, cond) => { assert.ok(cond, label); console.log(`✓ ${label}`); };

const health = await call('/health', { auth: false });
ok('health', health.status === 200 && health.data.ok);
for (const p of ['privacy', 'terms', 'support', 'erase']) {
  const r = await call(`/${p}`, { auth: false });
  ok(`/${p} page`, r.status === 200 && r.data.includes('Manendi'));
}
ok('no key → 401', (await call('/watch', { auth: false })).status === 401);
const dev = await call('/device', { body: { appUserId: 'smoke-' + randomBytes(6).toString('hex') } });
ok('device registers, on Free', dev.status === 200 && dev.data.plus === false);
ok('bad receipt → 400', (await call('/watch', { body: { receipt: 'ABC123' } })).status === 400);
const w = await call('/watch', { body: { receipt: 'ioe 0912345678', label: 'Ada · EAD' } });
ok('watch a case', w.status === 200 && w.data.receipt === 'IOE0912345678');
if (health.data.live) ok('live status comes back', !!w.data.status);
ok('second case needs Plus → 402', (await call('/watch', { body: { receipt: 'EAC9999103402' } })).status === 402);
if (dev.data.testMode) {
  const plan = await call('/billing/dev-grant', { body: { period: 'annual' } });
  ok('test purchase → Plus', plan.data.plus === true);
  ok('second case on Plus', (await call('/watch', { body: { receipt: 'EAC9999103402' } })).status === 200);
}
const list = await call('/watch');
ok('list watches', list.status === 200 && list.data.watches.length >= 1);
if (health.data.live) ok('refresh', (await call('/watch/IOE0912345678/refresh', { method: 'POST' })).status === 200);
ok('unwatch', (await call('/watch/IOE0912345678', { method: 'DELETE' })).status === 200);
ok('erase device', (await call('/device', { method: 'DELETE' })).status === 200);
ok('erased → nothing left', (await call('/watch')).data.watches.length === 0);
const radar = await call('/radar', { auth: false });
ok(`radar (${radar.data.items?.length ?? 0} items)`, radar.status === 200 && Array.isArray(radar.data.items));
console.log('smoke passed');
