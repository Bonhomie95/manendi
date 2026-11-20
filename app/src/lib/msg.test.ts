import { test } from 'node:test';
import assert from 'node:assert/strict';
import { format, plural } from './msg.ts';

// Node ships full ICU, so its Intl.PluralRules is the reference for the hand-written rules Hermes needs.
const LANGS = ['en', 'ar', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'es', 'es-ES', 'fi', 'fr', 'gu', 'he', 'hi', 'hr', 'hu', 'id', 'it',
  'ja', 'kn', 'ko', 'ml', 'mr', 'ms', 'nl', 'no', 'or', 'pa', 'pl', 'pt-BR', 'pt-PT', 'ro', 'ru', 'sk', 'sl', 'sv', 'ta', 'te', 'th',
  'tr', 'uk', 'ur', 'vi', 'zh-Hans', 'zh-Hant'];

test('plural categories match CLDR for whole numbers in every shipped language', () => {
  for (const lang of LANGS) {
    const icu = new Intl.PluralRules(lang === 'no' ? 'nb' : lang);
    for (let n = 0; n <= 2_000_000; n = n < 2000 ? n + 1 : n * 10) {
      assert.equal(plural(lang, n), icu.select(n), `${lang} ${n}`);
    }
  }
});

test('placeholders, plurals, exact matches and nesting', () => {
  const days = '{n, plural, =0 {no days} one {# day} other {# days}}';
  assert.equal(format(days, { n: 0 }), 'no days');
  assert.equal(format(days, { n: 1 }), '1 day');
  assert.equal(format(days, { n: 12 }), '12 days');
  assert.equal(format('{who} has {n, plural, one {# trip to {place}} other {# trips}}', { who: 'Ada', n: 1, place: 'Lagos' }), 'Ada has 1 trip to Lagos');
  assert.equal(format('Missing {x}'), 'Missing {x}');
  assert.equal(format('{n, plural, one {# день} few {# дня} many {# дней} other {# дня}}', { n: 22 }, 'ru'), '22 дня');
  assert.equal(format('{n, plural, one {# day} other {# days}}', { n: 1500 }, 'en', (v) => Number(v).toLocaleString('en')), '1,500 days');
});
