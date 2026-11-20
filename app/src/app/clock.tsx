import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { headline } from '@/components/clock-card';
import { Ring } from '@/components/ring';
import { Sheet } from '@/components/sheet';
import { Button, Card, CountUp, Icon, Row, T } from '@/components/ui';
import { openLink } from '@/lib/api';
import { full, today } from '@/lib/dates';
import { t, tr } from '@/lib/i18n';
import { clocks, inDays } from '@/lib/rules';
import { useStore } from '@/lib/store';
import { levelColor, tint, useColors } from '@/lib/theme';

const LEVEL = {
  over: t('clock.level.over'), urgent: t('clock.level.urgent'), soon: t('clock.level.soon'), ok: t('clock.level.ok'), info: t('clock.level.info'),
};

export default function ClockScreen() {
  const c = useColors();
  const { person, id } = useLocalSearchParams<{ person: string; id: string }>();
  const { data, plus } = useStore();
  const p = data.people.find((x) => x.id === person);
  const clock = p ? clocks(p, today(), tr).find((x) => x.id === id) : undefined;
  if (!p || !clock) return <Sheet title={t('clock.missing.title')} footer={null}><T muted>{t('clock.missing')}</T></Sheet>;
  const locked = !!clock.plus && !plus;
  const col = levelColor(c, clock.level);
  const big = headline(clock);
  const host = clock.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

  return (
    <Sheet title={clock.title} footer={
      <Row style={{ gap: 10 }}>
        <Button title={t('clock.editDates')} kind="soft" style={{ flex: 1 }} onPress={() => router.replace({ pathname: '/person', params: { id: p.id } })} />
        <Button title={locked ? t('clock.seePlus') : t('clock.official')} kind="accent" style={{ flex: 1.4 }} onPress={() => (locked ? router.replace('/plan') : openLink(clock.source))} />
      </Row>
    }>
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 11, backgroundColor: tint(col, 0.14) }}>
          <T v="label" color={col}>{LEVEL[clock.level]} · {p.name}</T>
        </View>
        {locked ? (
          <Card style={{ alignItems: 'center', gap: 10, alignSelf: 'stretch', paddingVertical: 28 }}>
            <Icon ios="lock.fill" android="lock" size={30} color={c.gold} />
            <T v="h2">{t('clock.plus.title')}</T>
            <T muted style={{ textAlign: 'center' }}>{t('clock.plus.body')}</T>
          </Card>
        ) : (
          <Ring size={230} progress={clock.progress ?? (clock.level === 'ok' ? 1 : 0.5)} color={col} track={c.line}>
            {big ? (
              <>
                <CountUp v="hero" color={col} style={{ fontSize: 70, lineHeight: 72 }} value={big.value} />
                <T v="small" muted>{big.unit}</T>
              </>
            ) : <Icon ios="info.circle.fill" android="info" size={48} color={col} />}
          </Ring>
        )}
        {clock.date && !locked && <T v="strong" color={col}>{full(clock.date)} · {inDays(clock.days ?? 0, tr)}</T>}
        {clock.count && !locked && (
          <T v="small" muted>{t(clock.count.unit === 'days' ? 'clock.used' : 'clock.usedAbroad', { used: clock.count.used, limit: clock.count.limit })}</T>
        )}
      </View>
      {!locked && <T style={{ fontSize: 17, lineHeight: 25 }}>{clock.note}</T>}
      <Card style={{ backgroundColor: c.soft, borderColor: 'transparent', boxShadow: 'none', gap: 6 }}>
        <Row><Icon ios="checkmark.shield.fill" android="verified_user" size={16} color={c.muted} /><T v="label">{t('clock.source.title')}</T></Row>
        <T v="small" muted>{t('clock.source.body', { host })}</T>
      </Card>
    </Sheet>
  );
}
