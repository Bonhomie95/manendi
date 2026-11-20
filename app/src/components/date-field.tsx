import { useState } from 'react';
import { View } from 'react-native';

import { Field, T } from '@/components/ui';
import { inDays, isDate } from '@/lib/rules';
import { diffDays, full, today } from '@/lib/dates';
import { t, tr } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

const toText = (iso?: string) => (iso ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : '');

/** MM/DD/YYYY, the way US documents print dates. Hands back 'YYYY-MM-DD', or undefined until it's a real date. */
// Keyboards for Arabic, Persian, Indic scripts, Thai and full-width input type their own digits: read them as 0–9.
const ZEROS = [0x660, 0x6f0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66, 0xe50, 0xff10];
const ascii = (s: string) => s.replace(/[\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\uFF10-\uFF19]/g,
  (c) => { const cp = c.codePointAt(0)!; return String(cp - ZEROS.find((z) => cp >= z && cp <= z + 9)!); });

export function DateField({ label, value, onChange, hint }: { label: string; value?: string; onChange: (iso: string | undefined) => void; hint?: string }) {
  const c = useColors();
  const [text, setText] = useState(toText(value));
  const digits = ascii(text).replace(/\D/g, '');
  const iso = digits.length === 8 ? `${digits.slice(4)}-${digits.slice(0, 2)}-${digits.slice(2, 4)}` : null;
  const bad = digits.length === 8 && !isDate(iso);
  return (
    <View style={{ gap: 6 }}>
      <Field label={label} value={text} placeholder={t('dateField.placeholder')} keyboardType="number-pad" maxLength={10}
        onChangeText={(s) => {
          const d = ascii(s).replace(/\D/g, '').slice(0, 8);
          const next = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
          setText(next);
          const v = d.length === 8 ? `${d.slice(4)}-${d.slice(0, 2)}-${d.slice(2, 4)}` : null;
          onChange(v && isDate(v) ? v : undefined);
        }} />
      {bad ? <T v="small" color={c.danger}>{t('dateField.invalid')}</T>
        : iso ? <T v="small" muted>{full(iso)} · {inDays(diffDays(today(), iso), tr)}</T>
          : hint ? <T v="small" muted>{hint}</T> : null}
    </View>
  );
}
