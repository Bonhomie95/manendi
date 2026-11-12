import { View } from 'react-native';
import { DateField } from '@/components/date-field';
import { Chip, Row, T } from '@/components/ui';
import { ASK, STATUS_GROUPS, type DateKey, type Person, type Status } from '@/lib/rules';

export const WORKING: Status[] = ['OPT', 'STEM OPT', 'H-1B', 'L-1', 'O-1', 'TN', 'E-3'];

/** Status picker shared by setup and the person editor. */
export function StatusPicker({ value, onChange }: { value: Status | null; onChange: (s: Status) => void }) {
  return (
    <View style={{ gap: 16 }}>
      {STATUS_GROUPS.map(([group, list]) => (
        <View key={group} style={{ gap: 8 }}>
          <T v="label">{group}</T>
          <Row style={{ flexWrap: 'wrap', gap: 8 }}>
            {list.map((s) => <Chip key={s} label={s} on={value === s} onPress={() => onChange(s)} />)}
          </Row>
        </View>
      ))}
    </View>
  );
}

/** The dates that matter for a status, plus its yes/no questions. */
export function DatesForm({ status, dates, setDates, ds, setDs, married, setMarried }: {
  status: Status; dates: Person['dates']; setDates: (d: Person['dates']) => void;
  ds: boolean; setDs: (v: boolean) => void; married: boolean; setMarried: (v: boolean) => void;
}) {
  const set = (k: DateKey, v?: string) => setDates({ ...dates, [k]: v });
  return (
    <View style={{ gap: 18 }}>
      {(status === 'F-1' || status === 'J-1') && (
        <Chip label="My I-94 says D/S (no date)" on={ds} onPress={() => setDs(!ds)} />
      )}
      {(status === 'Green card' || status === 'Conditional green card') && (
        <Chip label="Married to a US citizen (3-year path)" on={married} onPress={() => setMarried(!married)} />
      )}
      {ASK[status].map((a) => (
        <DateField key={`${status}-${a.key}`} label={a.label} hint={a.hint} value={dates[a.key]} onChange={(v) => set(a.key, v)} />
      ))}
    </View>
  );
}
