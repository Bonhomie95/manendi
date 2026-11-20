// The app speaks the first of the phone's languages that Manendi ships (or the one picked for Manendi in Settings),
// else English. A key missing from a dictionary falls back to English. Message syntax lives in msg.ts.
// Kept in English on purpose: form and status names (I-94, H-1B, USCIS…), USCIS case statuses, Federal Register titles,
// and the status report PDF, which is for attorneys and HR.
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import en from '@/i18n/en.json';
import { DICTS } from '@/i18n';
import { format, type Vars } from './msg';

export type Key = keyof typeof en;
export type Tr = (key: string, vars?: Vars) => string;

/** A phone locale → the dictionary that serves it. */
function dictFor(l: { languageCode: string | null; languageScriptCode: string | null; regionCode: string | null }) {
  const c = (l.languageCode ?? '').toLowerCase();
  const r = (l.regionCode ?? '').toUpperCase();
  if (c === 'zh') return l.languageScriptCode === 'Hant' || ['TW', 'HK', 'MO'].includes(r) ? 'zh-Hant' : 'zh-Hans';
  if (c === 'pt') return r && r !== 'BR' ? 'pt-PT' : 'pt-BR';
  if (c === 'es') return r === 'ES' ? 'es-ES' : 'es';
  if (c === 'nb' || c === 'nn') return 'no';
  if (c === 'iw') return 'he';
  if (c === 'in') return 'id';
  return c;
}

// ponytail: picked once at launch. iOS relaunches apps when the language changes; Android keeps the old language
// until the next launch, since screens build some text at import time.
const chosen = (() => {
  for (const l of getLocales()) {
    const tag = dictFor(l);
    if (tag === 'en' || DICTS[tag]) return { lang: tag, locale: l.languageTag };
  }
  return { lang: 'en', locale: 'en-US' };
})();

/** The dictionary in use, e.g. "pt-BR", and the phone's locale for numbers and dates, e.g. "pt-BR" or "es-US". */
export const { lang, locale } = chosen;
export const rtl = I18nManager.isRTL;
/** Scripts that come apart when letters are spaced out or set one by one: Arabic and Hebrew, Indic, Thai. */
export const joined = /^(ar|ur|he|hi|bn|mr|gu|pa|ta|te|kn|ml|or|th)$/.test(lang);
const EN: Record<string, string> = en;
const dict: Record<string, string> = { ...EN, ...(lang === 'en' ? {} : DICTS[lang]()) };

/** Numbers in the app's language, e.g. 1,234 or ١٬٢٣٤. */
export const num = (n: number) => n.toLocaleString(locale);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const show = (where: string) => (v: string | number) => {
  if (typeof v === 'number') return v.toLocaleString(where);
  if (!ISO.test(v)) return v;
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(where, { month: 'short', day: 'numeric', year: 'numeric' });
};

/** A message in the app's language. Number values and 'YYYY-MM-DD' dates are formatted for it. */
export const t = (key: Key, vars?: Vars) => format(dict[key] ?? EN[key] ?? key, vars, lang, show(locale));
/** The same message in English, for the status report. */
export const tEn = (key: Key, vars?: Vars) => format(EN[key] ?? key, vars, 'en', show('en-US'));
/** Loosely typed `t` for code that builds keys, like the status rules. */
export const tr: Tr = (key, vars) => t(key as Key, vars);
export const trEn: Tr = (key, vars) => tEn(key as Key, vars);
