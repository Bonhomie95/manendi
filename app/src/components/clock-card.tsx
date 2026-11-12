import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, Icon, T, Tap } from '@/components/ui';
import { full } from '@/lib/dates';
import { inDays, type Clock } from '@/lib/rules';
import { levelColor, tint, useColors } from '@/lib/theme';

const ICON: Record<Clock['kind'], [string, string]> = {
  expires: ['hourglass', 'hourglass_top'], window: ['door.left.hand.open', 'door_open'], counter: ['timer', 'timer'],
  milestone: ['flag.fill', 'flag'], info: ['info.circle.fill', 'info'],
};

/** The big number on the right: days left, or what's left of a counter. */
export function headline(c: Clock): { n: string; unit: string } | null {
  if (c.count) return { n: String(Math.max(0, c.count.limit - c.count.used)), unit: `${c.count.unit} left` };
  if (c.days === undefined || c.kind === 'info') return null;
  if (c.days < 0) return { n: String(-c.days), unit: 'days ago' };
  return { n: c.days.toLocaleString(), unit: c.days === 1 ? 'day' : 'days' };
}

export function ClockCard({ clock, who, locked }: { clock: Clock; who?: string; locked?: boolean }) {
  const c = useColors();
  const col = levelColor(c, clock.level);
  const big = locked ? null : headline(clock);
  const [ios, android] = ICON[clock.kind];
  return (
    <Tap onPress={() => router.push({ pathname: '/clock', params: { person: clock.personId, id: clock.id } })} accessibilityLabel={`${clock.title}${big ? `, ${big.n} ${big.unit}` : ''}`}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: tint(col, 0.14), alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios={locked ? 'lock.fill' : ios} android={locked ? 'lock' : android} size={19} color={col} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {who ? <T v="label" style={{ fontSize: 10.5 }}>{who}</T> : null}
          <T v="strong" numberOfLines={1}>{clock.title}</T>
          {locked ? <T v="small" muted>Part of Manendi Plus</T>
            : clock.date ? <T v="small" color={col}>{full(clock.date)} · {inDays(clock.days ?? 0)}</T>
              : <T v="small" muted numberOfLines={2}>{clock.note}</T>}
        </View>
        {big && (
          <View style={{ alignItems: 'flex-end' }}>
            <T v="title" color={col} style={{ fontSize: 30, lineHeight: 32 }}>{big.n}</T>
            <T v="small" muted style={{ fontSize: 11 }}>{big.unit}</T>
          </View>
        )}
        {!big && <Icon ios="chevron.right" android="chevron_right" size={14} color={c.muted} />}
      </Card>
    </Tap>
  );
}
