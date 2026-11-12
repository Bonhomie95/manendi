import { useState } from 'react';
import { View } from 'react-native';

import { Field, T } from '@/components/ui';
import { inDays, isDate } from '@/lib/rules';
import { diffDays, full, today } from '@/lib/dates';
import { useColors } from '@/lib/theme';

const toText = (iso?: string) => (iso ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : '');

/** MM/DD/YYYY, the way US documents print dates. Hands back 'YYYY-MM-DD', or undefined until it's a real date. */
export function DateField({ label, value, onChange, hint }: { label: string; value?: string; onChange: (iso: string | undefined) => void; hint?: string }) {
  const c = useColors();
  const [text, setText] = useState(toText(value));
  const digits = text.replace(/\D/g, '');
  const iso = digits.length === 8 ? `${digits.slice(4)}-${digits.slice(0, 2)}-${digits.slice(2, 4)}` : null;
  const bad = digits.length === 8 && !isDate(iso);
  return (
    <View style={{ gap: 6 }}>
      <Field label={label} value={text} placeholder="MM/DD/YYYY" keyboardType="number-pad" maxLength={10}
        onChangeText={(t) => {
          const d = t.replace(/\D/g, '').slice(0, 8);
          const next = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
          setText(next);
          const v = d.length === 8 ? `${d.slice(4)}-${d.slice(0, 2)}-${d.slice(2, 4)}` : null;
          onChange(v && isDate(v) ? v : undefined);
        }} />
      {bad ? <T v="small" color={c.danger}>That date doesn’t exist.</T>
        : iso ? <T v="small" muted>{full(iso)} · {inDays(diffDays(today(), iso))}</T>
          : hint ? <T v="small" muted>{hint}</T> : null}
    </View>
  );
}
