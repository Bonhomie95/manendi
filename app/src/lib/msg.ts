// Message formatting with no imports, so the app and `node --test` share it.
// Messages use {name} placeholders and ICU plurals: "{n, plural, one {# day} other {# days}}" (# is the number).
// Hermes has no Intl.PluralRules, so the CLDR rules for whole numbers in Manendi's languages live here.

export type Vars = Record<string, string | number>;
type Rule = (n: number) => string;

const slavic = (one: (n: number) => boolean, rest: string): Rule => (n) => {
  const t = n % 10, h = n % 100;
  if (one(n)) return 'one';
  return t >= 2 && t <= 4 && !(h >= 12 && h <= 14) ? 'few' : rest;
};
const oneIs1: Rule = (n) => (n === 1 ? 'one' : 'other');
const oneIs01: Rule = (n) => (n === 0 || n === 1 ? 'one' : 'other');
const million = (base: Rule): Rule => (n) => (n !== 0 && n % 1_000_000 === 0 ? 'many' : base(n));

const RULES: Record<string, Rule> = {
  ru: slavic((n) => n % 10 === 1 && n % 100 !== 11, 'many'),
  uk: slavic((n) => n % 10 === 1 && n % 100 !== 11, 'many'),
  pl: slavic((n) => n === 1, 'many'),
  hr: slavic((n) => n % 10 === 1 && n % 100 !== 11, 'other'),
  cs: (n) => (n === 1 ? 'one' : n >= 2 && n <= 4 ? 'few' : 'other'),
  sk: (n) => (n === 1 ? 'one' : n >= 2 && n <= 4 ? 'few' : 'other'),
  sl: (n) => { const h = n % 100; return h === 1 ? 'one' : h === 2 ? 'two' : h === 3 || h === 4 ? 'few' : 'other'; },
  ro: (n) => { const h = n % 100; return n === 1 ? 'one' : n === 0 || (h >= 1 && h <= 19) ? 'few' : 'other'; },
  ar: (n) => { const h = n % 100; return n === 0 ? 'zero' : n === 1 ? 'one' : n === 2 ? 'two' : h >= 3 && h <= 10 ? 'few' : h >= 11 ? 'many' : 'other'; },
  he: (n) => (n === 1 ? 'one' : n === 2 ? 'two' : 'other'),
  fr: million(oneIs01),
  'pt-BR': million(oneIs01),
  es: million(oneIs1), 'es-ES': million(oneIs1), it: million(oneIs1), ca: million(oneIs1), 'pt-PT': million(oneIs1),
  hi: oneIs01, bn: oneIs01, gu: oneIs01, kn: oneIs01, pa: oneIs01,
};
for (const l of ['ja', 'ko', 'zh-Hans', 'zh-Hant', 'th', 'vi', 'id', 'ms']) RULES[l] = () => 'other';

/** CLDR cardinal plural category of a whole number (one, few, many…) in one of Manendi's languages. */
export const plural = (lang: string, n: number) => (RULES[lang] ?? oneIs1)(Math.abs(Math.trunc(n)));

/** Index of the brace that closes the one at `open`. */
function close(s: string, open: number) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return s.length;
}

/** Fills placeholders and picks plural branches. `show` formats values (numbers, dates) for the language. */
export function format(msg: string, vars: Vars = {}, lang = 'en', show: (v: string | number) => string = String): string {
  let out = '';
  for (let i = 0; i < msg.length; i++) {
    if (msg[i] !== '{') { out += msg[i]; continue; }
    const end = close(msg, i);
    const body = msg.slice(i + 1, end);
    i = end;
    const m = /^\s*(\w+)\s*,\s*plural\s*,([\s\S]*)$/.exec(body);
    if (!m) {
      const v = vars[body.trim()];
      out += v === undefined ? `{${body}}` : show(v);
      continue;
    }
    const n = Number(vars[m[1]] ?? 0);
    const branches: Record<string, string> = {};
    for (let j = 0, rest = m[2]; j < rest.length; j++) {
      const k = /^\s*(=?\w+)\s*\{/.exec(rest.slice(j));
      if (!k) break;
      const open = j + k[0].length - 1;
      const shut = close(rest, open);
      branches[k[1]] = rest.slice(open + 1, shut);
      j = shut;
    }
    const pick = branches[`=${n}`] ?? branches[plural(lang, n)] ?? branches.other ?? '';
    out += format(pick.replace(/#/g, show(n)), vars, lang, show);
  }
  return out;
}

/** The plural categories a message uses for one placeholder, e.g. ["one", "other"]. For checking translations. */
export function pluralCategories(msg: string): string[][] {
  const found: string[][] = [];
  for (const m of msg.matchAll(/\{\s*\w+\s*,\s*plural\s*,/g)) {
    const start = m.index!;
    const body = msg.slice(start + 1, close(msg, start));
    found.push([...body.slice(body.indexOf('plural') + 7).matchAll(/(=?\w+)\s*\{/g)].map((x) => x[1]));
  }
  return found;
}
