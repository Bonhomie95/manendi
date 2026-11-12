import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Mark } from '@/components/brand';
import { ClockCard } from '@/components/clock-card';
import { Hero } from '@/components/hero';
import { Appear, Card, Chip, Float, Icon, Row, Screen, T, Tap } from '@/components/ui';
import { greeting } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

function Action({ ios, android, label, onPress }: { ios: string; android: string; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Tap onPress={onPress} accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 42, borderRadius: 21, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <Icon ios={ios} android={android} size={15} color={c.accent} />
      <T v="small" style={{ fontSize: 14 }}>{label}</T>
    </Tap>
  );
}

export default function Status() {
  const c = useColors();
  const { data, all, plus, me, sync } = useStore();
  const [who, setWho] = useState<string>('all');
  const people = data.people;
  const list = who === 'all' ? all : all.filter((x) => x.personId === who);
  const open = (x: (typeof list)[number]) => !x.plus || plus;
  // Up to four open clocks ride in the swipeable hero, most pressing first; the rest list below.
  const opened = list.filter(open);
  const pressing = opened.filter((x) => x.level !== 'info');
  const heroes = (pressing.length ? pressing : opened).slice(0, 4);
  const rest = list.filter((x) => !heroes.includes(x));
  const personId = who === 'all' ? me?.id : who;
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? '';

  return (
    <Screen onRefresh={sync}>
      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <View>
          <T v="label">{greeting()}</T>
          <T v="title">{who === 'all' && people.length > 1 ? 'Your household' : name(personId ?? '') || 'You'}</T>
        </View>
        <Float px={3} ms={3200}><Mark size={40} /></Float>
      </Row>

      {people.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Everyone" on={who === 'all'} onPress={() => setWho('all')} />
          {people.map((p) => <Chip key={p.id} label={p.name} on={who === p.id} onPress={() => setWho(p.id)} />)}
        </ScrollView>
      )}

      {heroes.length ? (
        <Hero key={who} clocks={heroes} label={(x, i) => (people.length > 1 && who === 'all' ? name(x.personId) : i ? 'Up next' : 'Most pressing')} />
      ) : (
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }}>
          <Float><Icon ios="calendar.badge.plus" android="event" size={34} color={c.accent} /></Float>
          <T v="h2">Add your first date</T>
          <T muted style={{ textAlign: 'center' }}>Your I-94, passport or work permit is a good start.</T>
          <Tap onPress={() => router.push({ pathname: '/person', params: { id: personId ?? 'new' } })}><T v="strong" color={c.accent}>Add dates</T></Tap>
        </Card>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        <Appear i={0}><Action ios="briefcase" android="work_off" label="My job ended" onPress={() => router.push({ pathname: '/job', params: { person: personId, mode: 'end' } })} /></Appear>
        <Appear i={1}><Action ios="briefcase.fill" android="work" label="New job" onPress={() => router.push({ pathname: '/job', params: { person: personId, mode: 'start' } })} /></Appear>
        <Appear i={2}><Action ios="airplane.departure" android="flight_takeoff" label="Add a trip" onPress={() => router.push({ pathname: '/trip', params: { person: personId } })} /></Appear>
        <Appear i={3}><Action ios="checklist" android="checklist" label="Before you fly" onPress={() => router.push({ pathname: '/fly', params: { person: personId } })} /></Appear>
        <Appear i={4}><Action ios="calendar" android="edit_calendar" label="Edit dates" onPress={() => router.push({ pathname: '/person', params: { id: personId } })} /></Appear>
      </ScrollView>

      {rest.length > 0 && <T v="label" style={{ marginTop: 6 }}>Coming up</T>}
      {rest.map((x, i) => (
        <Appear key={`${x.personId}-${x.id}`} i={i + 1}>
          <ClockCard clock={x} who={people.length > 1 && who === 'all' ? name(x.personId) : undefined} locked={x.plus && !plus} />
        </Appear>
      ))}

      <T v="small" muted style={{ textAlign: 'center', marginTop: 10 }}>Manendi gives information, not legal advice. Each clock links its official source.</T>
    </Screen>
  );
}
