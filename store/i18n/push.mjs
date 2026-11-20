// Pushes the translated store listings (store/i18n/<tag>.json) to App Store Connect and Google Play.
//   node store/i18n/push.mjs apple <version> [--submit]   e.g. 1.1.0: creates the version if needed (only once the
//     previous one has left review), attaches its newest processed build, sets the English text from en.json, copies
//     the review details, then every other language: app name/subtitle, version text, subscription group and plans.
//     --submit also sends it for review.
//   node store/i18n/push.mjs play               listings and subscription listings (release notes go with the release)
//   add --dry to only print what would change
// Env: ASC_KEY_PATH, ASC_KEY_ID, ASC_ISSUER (App Store Connect API key) and PLAY_SA (Play service-account JSON path).
// Approved subscription text can't be edited in place: a new localization is added and submitted, as App Store
// Connect itself does.
import { createPrivateKey, createSign, sign } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const [store, version] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DRY = process.argv.includes('--dry');
const SUBMIT = process.argv.includes('--submit');
const APP_ID = '6833923129';
const PKG = 'dev.bonhomieinc.manendi';
const at = (p) => new URL(p, import.meta.url);
const LANGS = JSON.parse(readFileSync(at('./languages.json'), 'utf8'));
const tags = readdirSync(at('./')).filter((f) => /\.json$/.test(f) && !['en.json', 'languages.json'].includes(f)).map((f) => f.slice(0, -5)).filter((t) => LANGS[t]);
const listing = (t) => JSON.parse(readFileSync(at(`./${t}.json`), 'utf8'));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const log = (...a) => console.log(DRY ? '[dry]' : '', ...a);

async function call(base, auth, path, { method = 'GET', body } = {}) {
  if (DRY && method !== 'GET') { log(method, path); return { data: { id: 'dry', attributes: {} } }; }
  const r = await fetch(base + path, { method, headers: { authorization: `Bearer ${await auth()}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
}

// ---------- App Store Connect ----------
function ascToken() {
  const key = createPrivateKey(readFileSync(process.env.ASC_KEY_PATH));
  const now = Math.floor(Date.now() / 1000);
  const head = `${b64({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' })}.${b64({ iss: process.env.ASC_ISSUER, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })}`;
  return `${head}.${sign('SHA256', Buffer.from(head), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
const asc = (path, o) => call('https://api.appstoreconnect.apple.com', ascToken, path, o);
const doc = (type, attributes, relationships, id) => ({ data: { type, ...(id && { id }), ...(attributes && { attributes }), ...(relationships && { relationships }) } });
const rel = (type, id) => ({ data: { type, id } });

/** Creates or updates one localization. Approved ones can't change, so those get a new localization instead. */
async function upsert(type, listPath, parentRel, locale, attrs) {
  const mine = (await asc(listPath)).data.filter((x) => x.attributes.locale === locale);
  if (mine.some((x) => Object.entries(attrs).every(([k, v]) => (x.attributes[k] ?? null) === (v ?? null)))) return;
  const draft = mine.find((x) => !['APPROVED', 'ACTIVE'].includes(x.attributes.state));
  if (draft) await asc(`/v1/${type}/${draft.id}`, { method: 'PATCH', body: doc(type, attrs, null, draft.id) });
  else await asc(`/v1/${type}`, { method: 'POST', body: doc(type, { locale, ...attrs }, parentRel) });
  log(draft ? 'updated' : 'added', type, locale);
}

async function apple() {
  if (!version) throw new Error('usage: push.mjs apple <version> [--submit]');
  const versions = (await asc(`/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=10`)).data;
  let v = versions.find((x) => x.attributes.versionString === version);
  if (!v) {
    v = (await asc('/v1/appStoreVersions', { method: 'POST', body: doc('appStoreVersions', { platform: 'IOS', versionString: version, releaseType: 'AFTER_APPROVAL' }, { app: rel('apps', APP_ID) }) })).data;
    log('created version', version);
  }
  const build = (await asc(`/v1/builds?filter[app]=${APP_ID}&filter[preReleaseVersion.version]=${version}&filter[processingState]=VALID&sort=-uploadedDate&limit=1`)).data[0];
  if (!build) throw new Error(`no processed ${version} build in App Store Connect yet`);
  await asc(`/v1/appStoreVersions/${v.id}/relationships/build`, { method: 'PATCH', body: rel('builds', build.id) });
  log('build', build.attributes.version, 'attached');
  const review = await asc(`/v1/appStoreVersions/${v.id}/appStoreReviewDetail`).catch(() => ({ data: null }));
  if (!review.data) {
    const prev = versions.find((x) => x.attributes.versionString !== version);
    const old = (await asc(`/v1/appStoreVersions/${prev.id}/appStoreReviewDetail`)).data.attributes;
    const keep = ['contactFirstName', 'contactLastName', 'contactPhone', 'contactEmail', 'demoAccountRequired', 'notes'];
    await asc('/v1/appStoreReviewDetails', { method: 'POST', body: doc('appStoreReviewDetails', Object.fromEntries(keep.map((k) => [k, old[k]])), { appStoreVersion: rel('appStoreVersions', v.id) }) });
    log('review details copied from', prev.attributes.versionString);
  }
  const info = (await asc(`/v1/apps/${APP_ID}/appInfos`)).data.find((x) => !['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'].includes(x.attributes.appStoreState ?? x.attributes.state));
  const group = (await asc(`/v1/apps/${APP_ID}/subscriptionGroups?include=subscriptions`));
  const subs = Object.fromEntries((group.included ?? []).map((s) => [s.attributes.productId, s.id]));
  const enUS = (await asc(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`)).data.find((x) => x.attributes.locale === 'en-US').attributes;
  const en = JSON.parse(readFileSync(at('./en.json'), 'utf8')).apple;
  await upsert('appStoreVersionLocalizations', `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`, { appStoreVersion: rel('appStoreVersions', v.id) }, 'en-US',
    { description: en.description, keywords: en.keywords, promotionalText: en.promotionalText, whatsNew: en.whatsNew, supportUrl: enUS.supportUrl });
  for (const t of tags) {
    const a = listing(t).apple;
    for (const locale of LANGS[t].apple) {
      if (info) await upsert('appInfoLocalizations', `/v1/appInfos/${info.id}/appInfoLocalizations`, { appInfo: rel('appInfos', info.id) }, locale,
        { name: a.name, subtitle: a.subtitle, privacyPolicyUrl: 'https://manendi.onrender.com/privacy' });
      await upsert('appStoreVersionLocalizations', `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`, { appStoreVersion: rel('appStoreVersions', v.id) }, locale,
        { description: a.description, keywords: a.keywords, promotionalText: a.promotionalText, whatsNew: a.whatsNew, supportUrl: enUS.supportUrl });
      await upsert('subscriptionGroupLocalizations', `/v1/subscriptionGroups/${group.data[0].id}/subscriptionGroupLocalizations`,
        { subscriptionGroup: rel('subscriptionGroups', group.data[0].id) }, locale, { name: a.subscriptionGroup });
      for (const [pid, name] of [['manendi.plus.monthly', a.subscriptionMonthlyName], ['manendi.plus.annual', a.subscriptionAnnualName]]) {
        await upsert('subscriptionLocalizations', `/v1/subscriptions/${subs[pid]}/subscriptionLocalizations`, { subscription: rel('subscriptions', subs[pid]) }, locale,
          { name, description: a.subscriptionDescription })
          .catch((e) => console.log('subscription', pid, locale, 'not added:', e.message.slice(0, 160)));
      }
    }
    console.log('✔ apple', t);
  }
  for (const id of Object.values(subs)) {
    await asc('/v1/subscriptionSubmissions', { method: 'POST', body: doc('subscriptionSubmissions', null, { subscription: rel('subscriptions', id) }) })
      .then(() => log('submitted subscription', id)).catch((e) => console.log('subscription submission:', e.message.slice(0, 160)));
  }
  if (!SUBMIT) return;
  let rs = (await asc(`/v1/reviewSubmissions?filter[app]=${APP_ID}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW`)).data[0];
  if (!rs) rs = (await asc('/v1/reviewSubmissions', { method: 'POST', body: doc('reviewSubmissions', { platform: 'IOS' }, { app: rel('apps', APP_ID) }) })).data;
  await asc('/v1/reviewSubmissionItems', { method: 'POST', body: doc('reviewSubmissionItems', null, { reviewSubmission: rel('reviewSubmissions', rs.id), appStoreVersion: rel('appStoreVersions', v.id) }) });
  await asc(`/v1/reviewSubmissions/${rs.id}`, { method: 'PATCH', body: doc('reviewSubmissions', { submitted: true }, null, rs.id) });
  console.log('✔ submitted', version, 'for review');
}

// ---------- Google Play ----------
let playTok;
async function playToken() {
  if (playTok) return playTok;
  const sa = JSON.parse(readFileSync(process.env.PLAY_SA, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const head = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: sa.token_uri, iat: now, exp: now + 3600 })}`;
  const assertion = `${head}.${createSign('RSA-SHA256').update(head).sign(sa.private_key).toString('base64url')}`;
  const r = await fetch(sa.token_uri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  return (playTok = (await r.json()).access_token);
}
const play = (path, o) => call(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`, playToken, path, o);

async function playStore() {
  const edit = DRY ? 'dry' : (await play('/edits', { method: 'POST', body: {} })).id;
  for (const t of tags) {
    const p = listing(t).play;
    for (const language of LANGS[t].play) {
      await play(`/edits/${edit}/listings/${language}`, { method: 'PUT', body: { language, title: p.title, shortDescription: p.shortDescription, fullDescription: p.fullDescription } });
    }
    console.log('✔ play listing', t);
  }
  if (!DRY) await play(`/edits/${edit}:commit`, { method: 'POST' });
  for (const [pid, key] of [['manendi.plus.monthly', 'subscriptionMonthlyTitle'], ['manendi.plus.annual', 'subscriptionAnnualTitle']]) {
    if (DRY) { log('would update', pid, 'listings'); continue; }
    const s = await play(`/subscriptions/${pid}`);
    const listings = [s.listings.find((l) => l.languageCode === 'en-US'),
      ...tags.flatMap((t) => { const p = listing(t).play; return LANGS[t].play.map((languageCode) => ({ languageCode, title: p[key], benefits: p.subscriptionBenefits, description: p.subscriptionDescription })); })];
    const conv = await play('/pricing:convertRegionPrices', { method: 'POST', body: { price: { currencyCode: 'USD', units: '1', nanos: 0 } } });
    await play(`/subscriptions/${pid}?updateMask=listings&regionsVersion.version=${conv.regionVersion.version}`, { method: 'PATCH', body: { ...s, listings } });
    console.log('✔ play subscription', pid, `${listings.length} languages`);
  }
}

/** Release notes for every language, for the production release of a new version. */
export const playReleaseNotes = () => [
  { language: 'en-US', text: JSON.parse(readFileSync(at('./en.json'), 'utf8')).play.releaseNotes },
  ...tags.flatMap((t) => LANGS[t].play.map((language) => ({ language, text: listing(t).play.releaseNotes }))),
];

if (import.meta.main) {
  if (store === 'apple') await apple();
  else if (store === 'play') await playStore();
  else throw new Error('usage: push.mjs apple <version> [--submit] | play [--dry]');
}
