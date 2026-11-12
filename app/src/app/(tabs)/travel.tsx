import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ClockCard } from '@/components/clock-card';
import { Card, Chip, Icon, Row, Screen, T, Tap } from '@/components/ui';
import { full, today } from '@/lib/dates';
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
  const t = today();
  const year = t.slice(0, 4);
  const thisYear = totalAbroad(p.trips, `${year}-01-01`, t);
  const away = p.trips.find((x) => !x.return || x.return > t);
  const clocks = all.filter((x) => x.personId === p.id && (TRAVEL_CLOCKS.includes(x.id) || x.id.startsWith('residence-')));
  const trips = [...p.trips].sort((a, b) => (a.depart < b.depart ? 1 : -1));

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <T v="title">Travel</T>
        <Tap onPress={() => router.push({ pathname: '/trip', params: { person: p.id } })} accessibilityLabel="Add a trip"
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
          <T v="label">Abroad in {year}</T>
          <T v="title">{thisYear}</T>
          <T v="small" muted>full days</T>
        </Card>
        <Card style={{ flex: 1, gap: 2 }}>
          <T v="label">Trips logged</T>
          <T v="title">{p.trips.length}</T>
          <T v="small" muted>all time</T>
        </Card>
      </Row>

      {away && away.depart <= t && (
        <Card style={{ backgroundColor: tint(c.gold, 0.1), borderColor: tint(c.gold, 0.35), gap: 4 }}>
          <Row><Icon ios="airplane.departure" android="flight_takeoff" size={18} color={c.gold} /><T v="strong">Away now{away.place ? ` · ${away.place}` : ''}</T></Row>
          <T v="small" muted>Left {full(away.depart)} · {daysAbroad(away, away.depart, t)} days abroad so far{away.return ? `. Back ${full(away.return)}.` : '.'}</T>
        </Card>
      )}

      {clocks.map((x) => <ClockCard key={x.id} clock={x} locked={x.plus && !plus} />)}

      <Tap onPress={() => router.push({ pathname: '/fly', params: { person: p.id } })} accessibilityLabel="Before you fly checklist">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: tint(c.accent, 0.14), alignItems: 'center', justifyContent: 'center' }}>
            <Icon ios="checklist" android="checklist" size={19} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}><T v="strong">Before you fly</T><T v="small" muted>What to carry for {p.status}, and anything about to expire.</T></View>
          <Icon ios="chevron.right" android="chevron_right" size={14} color={c.muted} />
        </Card>
      </Tap>

      <T v="label" style={{ marginTop: 6 }}>Trips</T>
      {!trips.length && <T muted>No trips yet. Log trips abroad to power the citizenship travel budget and the H-1B day count.</T>}
      {trips.map((x) => (
        <Tap key={x.id} onPress={() => router.push({ pathname: '/trip', params: { person: p.id, id: x.id } })} accessibilityLabel={`Trip ${x.place ?? ''}`}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="strong">{x.place || 'Trip abroad'}</T>
              <T v="small" muted>{full(x.depart)} → {x.return ? full(x.return) : 'still away'}</T>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <T v="h2">{daysAbroad(x, x.depart, x.return ?? t)}</T>
              <T v="small" muted style={{ fontSize: 11 }}>days out</T>
            </View>
          </Card>
        </Tap>
      ))}
      {trips.length > 0 && <T v="small" muted style={{ textAlign: 'center' }}>Departure and return days count as days in the US.</T>}
    </Screen>
  );
}
