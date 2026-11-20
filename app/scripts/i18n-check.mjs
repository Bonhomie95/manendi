// Checks translations against English: app dictionaries (src/i18n/<tag>.json) and store listings (../store/i18n/<tag>.json).
// Usage, from app/: node scripts/i18n-check.mjs [tag…]   (no tags = every language in ../store/i18n/languages.json)
// Errors (exit 1): missing/extra keys, lost or invented placeholders, plural forms the language needs but lacks,
// official names (I-94, USCIS…) changed, store fields over their limits. Warnings: text left identical to English.
import { existsSync, readFileSync } from 'node:fs';
import { format } from '../src/lib/msg.ts';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const EN = read('../src/i18n/en.json');
const STORE_EN = read('../../store/i18n/en.json');
const LANGS = read('../../store/i18n/languages.json');
const tags = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LANGS);

// Official names that must survive translation exactly as written in English.
const PROTECTED = /(?<![\w-])(Manendi|USCIS|DSO|SEVIS|CBP|STEM|OPT|EAD|D\/S|TPS|DS-2019|[IN]-\d{2,3}|EB-\d|H-1B|H-4|L-[12]|O-1|TN|E-3|F-1|J-1|B-1\/B-2|Face ID)(?![\w-])/g;
const LIMITS = {
  'apple.name': 30, 'apple.subtitle': 30, 'apple.promotionalText': 170, 'apple.description': 4000, 'apple.keywords': 100,
  'apple.whatsNew': 4000, 'apple.subscriptionGroup': 75, 'apple.subscriptionMonthlyName': 30, 'apple.subscriptionAnnualName': 30,
  'apple.subscriptionDescription': 55, 'play.title': 30, 'play.shortDescription': 80, 'play.fullDescription': 4000,
  'play.releaseNotes': 500, 'play.subscriptionMonthlyTitle': 55, 'play.subscriptionAnnualTitle': 55, 'play.subscriptionDescription': 80,
};
const len = (s) => [...s].length;

/** Variables a message uses: { simple: Set, plural: Map<name, categories[]> }; throws on unbalanced braces. */
function vars(msg, out = { simple: new Set(), plural: new Map() }) {
  for (let i = 0; i < msg.length; i++) {
    if (msg[i] === '}') throw new Error('unmatched }');
    if (msg[i] !== '{') continue;
    let depth = 0, j = i;
    for (; j < msg.length; j++) { if (msg[j] === '{') depth++; else if (msg[j] === '}' && --depth === 0) break; }
    if (j >= msg.length) throw new Error('unmatched {');
    const body = msg.slice(i + 1, j);
    i = j;
    const m = /^\s*(\w+)\s*,\s*plural\s*,([\s\S]*)$/.exec(body);
    if (!m) {
      if (!/^\s*\w+\s*$/.test(body)) throw new Error(`odd placeholder {${body}}`);
      out.simple.add(body.trim());
      continue;
    }
    const cats = [];
    const rest = m[2];
    for (let k = 0; k < rest.length; k++) {
      const b = /^\s*(=?\w+)\s*\{/.exec(rest.slice(k));
      if (!b) { if (rest.slice(k).trim()) throw new Error(`odd plural text "${rest.slice(k).trim().slice(0, 20)}"`); break; }
      const open = k + b[0].length - 1;
      let d = 0, close = open;
      for (; close < rest.length; close++) { if (rest[close] === '{') d++; else if (rest[close] === '}' && --d === 0) break; }
      cats.push(b[1]);
      vars(rest.slice(open + 1, close).replace(/#/g, ''), out);
      k = close;
    }
    out.plural.set(m[1], cats);
  }
  return out;
}

/** The plural categories a language needs for whole numbers. */
function needed(tag) {
  const icu = new Intl.PluralRules(tag === 'no' ? 'nb' : tag);
  const s = new Set(['other']);
  for (let n = 0; n <= 1000; n++) s.add(icu.select(n));
  return [...s];
}

let errors = 0, warnings = 0;
const err = (tag, where, msg) => { errors++; console.log(`  ✖ ${tag} ${where}: ${msg}`); };
const warn = (tag, where, msg) => { warnings++; if (process.env.VERBOSE) console.log(`  · ${tag} ${where}: ${msg}`); };

function checkText(tag, where, en, tr) {
  if (typeof tr !== 'string' || !tr.trim()) return err(tag, where, 'missing or empty');
  let ve, vt;
  try { ve = vars(en); } catch (e) { return err(tag, where, `English: ${e.message}`); }
  try { vt = vars(tr); } catch (e) { return err(tag, where, e.message); }
  const need = needed(tag);
  for (const name of [...ve.simple, ...ve.plural.keys()]) {
    if (!vt.simple.has(name) && !vt.plural.has(name)) err(tag, where, `lost {${name}}`);
  }
  for (const name of [...vt.simple, ...vt.plural.keys()]) {
    if (!ve.simple.has(name) && !ve.plural.has(name)) err(tag, where, `unknown {${name}}`);
  }
  for (const [name, cats] of vt.plural) {
    const missing = need.filter((c) => !cats.includes(c));
    if (missing.length) err(tag, where, `{${name}, plural} needs ${missing.join(', ')}`);
  }
  for (const name of ve.plural.keys()) {
    if (vt.simple.has(name) && !vt.plural.has(name) && need.length > 1) err(tag, where, `{${name}} needs plural forms (${need.join(', ')})`);
  }
  for (const tok of new Set(en.match(PROTECTED) ?? [])) {
    if (!tr.includes(tok)) err(tag, where, `changed or dropped "${tok}"`);
  }
  try {
    const sample = Object.fromEntries([...ve.simple, ...ve.plural.keys()].map((v) => [v, ve.plural.has(v) ? 3 : 'X']));
    const out = format(tr, sample, tag);
    if (/\{\s*\w+\s*\}/.test(out)) err(tag, where, `unfilled placeholder in "${out.slice(0, 60)}"`);
  } catch (e) { err(tag, where, `doesn't format: ${e.message}`); }
  if (tr === en && /[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/i.test(en.replace(PROTECTED, ''))) warn(tag, where, 'same as English');
}

for (const tag of tags) {
  const before = errors;
  if (!LANGS[tag]) { err(tag, '', 'not in store/i18n/languages.json'); continue; }
  const appFile = new URL(`../src/i18n/${tag}.json`, import.meta.url);
  if (!existsSync(appFile)) err(tag, 'app', 'no app dictionary');
  else {
    const d = JSON.parse(readFileSync(appFile, 'utf8'));
    for (const k of Object.keys(EN)) checkText(tag, k, EN[k], d[k]);
    for (const k of Object.keys(d)) if (!(k in EN)) err(tag, k, 'not in en.json');
  }
  const storeFile = new URL(`../../store/i18n/${tag}.json`, import.meta.url);
  if (!existsSync(storeFile)) err(tag, 'store', 'no store listing');
  else {
    const s = JSON.parse(readFileSync(storeFile, 'utf8'));
    for (const store of ['apple', 'play']) {
      for (const [k, en] of Object.entries(STORE_EN[store])) {
        const where = `${store}.${k}`, tr = s[store]?.[k];
        if (Array.isArray(en)) {
          if (!Array.isArray(tr) || tr.length !== en.length) { err(tag, where, `needs ${en.length} items`); continue; }
          tr.forEach((x, i) => { checkText(tag, `${where}[${i}]`, en[i], x); if (len(x) > 40) err(tag, `${where}[${i}]`, `${len(x)} > 40 characters`); });
          continue;
        }
        checkText(tag, where, en, tr);
        if (typeof tr === 'string' && LIMITS[where] && len(tr) > LIMITS[where]) err(tag, where, `${len(tr)} > ${LIMITS[where]} characters`);
      }
      for (const k of Object.keys(s[store] ?? {})) if (!(k in STORE_EN[store])) err(tag, `${store}.${k}`, 'not in store en.json');
    }
    if (!s.apple?.name?.startsWith('Manendi') || !s.play?.title?.startsWith('Manendi')) err(tag, 'name', 'must start with "Manendi"');
    for (const url of STORE_EN.apple.description.match(/https:\/\/\S+/g)) if (!s.apple?.description?.includes(url)) err(tag, 'apple.description', `lost ${url}`);
    for (const p of ['$9.99', '$79.99']) if (!s.apple?.description?.includes(p)) err(tag, 'apple.description', `lost ${p}`);
    for (const d of ['uscis.gov', 'egov.uscis.gov', 'federalregister.gov', 'travel.state.gov', 'i94.cbp.dhs.gov']) {
      if (!s.play?.fullDescription?.includes(d)) err(tag, 'play.fullDescription', `lost ${d}`);
    }
    if (/,\s/.test(s.apple?.keywords ?? '')) warn(tag, 'apple.keywords', 'space after a comma wastes characters');
  }
  console.log(`${errors > before ? '✖' : '✔'} ${tag}${errors > before ? ` — ${errors - before} errors` : ''}`);
}
console.log(`\n${tags.length} languages · ${errors} errors · ${warnings} warnings${warnings && !process.env.VERBOSE ? ' (VERBOSE=1 to list)' : ''}`);
process.exit(errors ? 1 : 0);
