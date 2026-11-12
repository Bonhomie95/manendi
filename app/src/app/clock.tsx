import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { headline } from '@/components/clock-card';
import { Ring } from '@/components/ring';
import { Sheet } from '@/components/sheet';
import { Button, Card, Icon, Row, T } from '@/components/ui';
import { openLink } from '@/lib/api';
import { full, today } from '@/lib/dates';
import { clocks, inDays } from '@/lib/rules';
import { useStore } from '@/lib/store';
import { levelColor, tint, useColors } from '@/lib/theme';

const LEVEL = { over: 'Past due', urgent: 'Act now', soon: 'Coming up', ok: 'On track', info: 'Good to know' };

export default function ClockScreen() {
  const c = useColors();
  const { person, id } = useLocalSearchParams<{ person: string; id: string }>();
  const { data, plus } = useStore();
  const p = data.people.find((x) => x.id === person);
  const clock = p ? clocks(p, today()).find((x) => x.id === id) : undefined;
  if (!p || !clock) return <Sheet title="Date" footer={null}><T muted>This date no longer applies.</T></Sheet>;
  const locked = !!clock.plus && !plus;
  const col = levelColor(c, clock.level);
  const big = headline(clock);
  const host = clock.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

  return (
    <Sheet title={clock.title} footer={
      <Row style={{ gap: 10 }}>
        <Button title="Edit dates" kind="soft" style={{ flex: 1 }} onPress={() => router.replace({ pathname: '/person', params: { id: p.id } })} />
        <Button title={locked ? 'See Plus' : `Open ${host}`} kind="accent" style={{ flex: 1.4 }} onPress={() => (locked ? router.replace('/plan') : openLink(clock.source))} />
      </Row>
    }>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 11, backgroundColor: tint(col, 0.14) }}>
          <T v="label" color={col}>{LEVEL[clock.level]} · {p.name}</T>
        </View>
        {locked ? (
          <Card style={{ alignItems: 'center', gap: 10, alignSelf: 'stretch', paddingVertical: 28 }}>
            <Icon ios="lock.fill" android="lock" size={30} color={c.gold} />
            <T v="h2">Part of Manendi Plus</T>
            <T muted style={{ textAlign: 'center' }}>Unlock this clock and the rest of Plus for your whole household.</T>
          </Card>
        ) : (
          <Ring size={230} progress={clock.progress ?? (clock.level === 'ok' ? 1 : 0.5)} color={col} track={c.line}>
            {big ? (
              <>
                <T v="hero" color={col} style={{ fontSize: 70, lineHeight: 72 }}>{big.n}</T>
                <T v="small" muted>{big.unit}</T>
              </>
            ) : <Icon ios="info.circle.fill" android="info" size={48} color={col} />}
          </Ring>
        )}
        {clock.date && !locked && <T v="strong" color={col}>{full(clock.date)} · {inDays(clock.days ?? 0)}</T>}
        {clock.count && !locked && <T v="small" muted>{clock.count.used} of {clock.count.limit} {clock.count.unit} used</T>}
      </View>
      {!locked && <T style={{ fontSize: 17, lineHeight: 25 }}>{clock.note}</T>}
      <Card style={{ backgroundColor: c.soft, borderColor: 'transparent', boxShadow: 'none', gap: 6 }}>
        <Row><Icon ios="checkmark.shield.fill" android="verified_user" size={16} color={c.muted} /><T v="label">Where this comes from</T></Row>
        <T v="small" muted>Worked out from the dates you entered and the published rule at {host}. Rules change and have exceptions, so this is information, not legal advice. Confirm big decisions with your DSO, HR or an immigration attorney.</T>
      </Card>
    </Sheet>
  );
}
