import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ClockCard } from '@/components/clock-card';
import { Appear, Card, Chip, CountUp, Icon, Row, Screen, T, Tap } from '@/components/ui';
import { full, today } from '@/lib/dates';
import { t, type Key } from '@/lib/i18n';
import { daysAbroad, totalAbroad } from '@/lib/rules';
import { useStore } from '@/lib/store';
import { tint, useColors } from '@/lib/theme';

const TRAVEL_CLOCKS = ['presence', 'h1b-max', 'passport', 'visa'];

export default function Travel() {
  const c = useColors();
  const { data, all, plus, me } = useStore();
  const [who, setWho] = useState(me?.id);
  const p = data.people.find((x) => x.id === who) ?? me;
  if (!p) return null;
  const now = today();
  const year = now.slice(0, 4);
  const thisYear = totalAbroad(p.trips, `${year}-01-01`, now);
  const away = p.trips.find((x) => !x.return || x.return > now);
  const clocks = all.filter((x) => x.personId === p.id && (TRAVEL_CLOCKS.includes(x.id) || x.id.startsWith('residence-')));
  const trips = [...p.trips].sort((a, b) => (a.depart < b.depart ? 1 : -1));

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <T v="title">{t('tabs.travel')}</T>
        <Tap onPress={() => router.push({ pathname: '/trip', params: { person: p.id } })} accessibilityLabel={t('travel.addTrip')}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios="plus" android="add" size={18} color={c.bg} />
        </Tap>
      </Row>
      {data.people.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {data.people.map((x) => <Chip key={x.id} label={x.name} on={x.id === p.id} onPress={() => setWho(x.id)} />)}
        </ScrollView>
      )}

      <Row style={{ gap: 12 }}>
        <Card style={{ flex: 1, gap: 2 }}>
          <T v="label">{t('travel.abroadIn', { year })}</T>
          <CountUp v="title" value={thisYear} />
          <T v="small" muted>{t('travel.fullDays', { n: thisYear })}</T>
        </Card>
        <Card style={{ flex: 1, gap: 2 }}>
          <T v="label">{t('travel.tripsLogged')}</T>
          <CountUp v="title" value={p.trips.length} />
          <T v="small" muted>{t('travel.allTime')}</T>
        </Card>
      </Row>

      {away && away.depart <= now && (
        <Card style={{ backgroundColor: tint(c.gold, 0.1), borderColor: tint(c.gold, 0.35), gap: 4 }}>
          <Row><Icon ios="airplane.departure" android="flight_takeoff" size={18} color={c.gold} /><T v="strong">{t('travel.awayNow')}{away.place ? ` · ${away.place}` : ''}</T></Row>
          <T v="small" muted>{away.return
            ? t('travel.away.back', { left: full(away.depart), n: daysAbroad(away, away.depart, now), back: full(away.return) })
            : t('travel.away', { left: full(away.depart), n: daysAbroad(away, away.depart, now) })}</T>
        </Card>
      )}

      {clocks.map((x, i) => <Appear key={x.id} i={i}><ClockCard clock={x} locked={x.plus && !plus} /></Appear>)}

      <Tap onPress={() => router.push({ pathname: '/fly', params: { person: p.id } })} accessibilityLabel={t('travel.beforeFly.a11y')}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: tint(c.accent, 0.14), alignItems: 'center', justifyContent: 'center' }}>
            <Icon ios="checklist" android="checklist" size={19} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}><T v="strong">{t('travel.beforeFly')}</T><T v="small" muted>{t('travel.beforeFly.sub', { status: t(`status.${p.status}` as Key) })}</T></View>
          <Icon ios="chevron.right" android="chevron_right" size={14} color={c.muted} />
        </Card>
      </Tap>

      <T v="label" style={{ marginTop: 6 }}>{t('travel.trips')}</T>
      {!trips.length && <T muted>{t('travel.empty')}</T>}
      {trips.map((x, i) => {
        const days = daysAbroad(x, x.depart, x.return ?? now);
        return (
          <Appear key={x.id} i={i}><Tap onPress={() => router.push({ pathname: '/trip', params: { person: p.id, id: x.id } })} accessibilityLabel={t('travel.trip.a11y', { place: x.place ?? '' })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="strong">{x.place || t('travel.trip.untitled')}</T>
                <T v="small" muted>{x.return ? t('travel.trip.dates', { from: full(x.depart), to: full(x.return) }) : t('travel.trip.datesOpen', { from: full(x.depart) })}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <CountUp v="h2" value={days} />
                <T v="small" muted style={{ fontSize: 11 }}>{t('travel.daysOut', { n: days })}</T>
              </View>
            </Card>
          </Tap></Appear>
        );
      })}
      {trips.length > 0 && <T v="small" muted style={{ textAlign: 'center' }}>{t('travel.footnote')}</T>}
    </Screen>
  );
}
