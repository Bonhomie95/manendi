import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Mark } from '@/components/brand';
import { ClockCard, headline } from '@/components/clock-card';
import { Ring } from '@/components/ring';
import { Card, Chip, Icon, Row, Screen, T, Tap } from '@/components/ui';
import { full, greeting } from '@/lib/dates';
import { inDays } from '@/lib/rules';
import { useStore } from '@/lib/store';
import { brand, levelColor, tint, useColors } from '@/lib/theme';

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
  const { data, all, plus, me, sync, syncing } = useStore();
  const [who, setWho] = useState<string>('all');
  const people = data.people;
  const list = who === 'all' ? all : all.filter((x) => x.personId === who);
  const open = (x: (typeof list)[number]) => !x.plus || plus;
  const top = list.find((x) => x.level !== 'info' && open(x)) ?? list.find(open);
  const rest = list.filter((x) => x !== top);
  const personId = who === 'all' ? me?.id : who;
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? '';
  const big = top ? headline(top) : null;
  const col = top ? levelColor(c, top.level) : c.accent;

  return (
    <Screen onRefresh={sync} refreshing={syncing}>
      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <View>
          <T v="label">{greeting()}</T>
          <T v="title">{who === 'all' && people.length > 1 ? 'Your household' : name(personId ?? '') || 'You'}</T>
        </View>
        <Mark size={40} />
      </Row>

      {people.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Everyone" on={who === 'all'} onPress={() => setWho('all')} />
          {people.map((p) => <Chip key={p.id} label={p.name} on={who === p.id} onPress={() => setWho(p.id)} />)}
        </ScrollView>
      )}

      {top ? (
        <Tap onPress={() => router.push({ pathname: '/clock', params: { person: top.personId, id: top.id } })} accessibilityLabel={`Most pressing: ${top.title}`}>
          <Animated.View entering={FadeInDown.springify().damping(16)} style={{
            borderRadius: 32, padding: 22, gap: 16, overflow: 'hidden', alignItems: 'center',
            backgroundImage: `linear-gradient(160deg, ${brand.ink2}, ${brand.ink})`, boxShadow: '0 18px 40px rgba(15,27,45,0.28)',
          }}>
            <View style={{ position: 'absolute', width: 320, height: 320, borderRadius: 160, right: -120, top: -140, backgroundImage: `radial-gradient(circle, ${tint(col, 0.35)} 0%, ${tint(col, 0)} 70%)` }} />
            <Row style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}>
              <T v="label" color={tint('#F7F4EC', 0.7)}>{people.length > 1 && who === 'all' ? name(top.personId) : 'Most pressing'}</T>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: tint(col, 0.22) }}>
                <T v="label" color={col} style={{ fontSize: 10.5 }}>{{ over: 'Past due', urgent: 'Act now', soon: 'Coming up', ok: 'On track', info: 'Good to know' }[top.level]}</T>
              </View>
            </Row>
            <Ring size={210} progress={top.progress ?? (top.level === 'ok' ? 1 : 0.5)} color={col} track="rgba(255,255,255,0.12)">
              {big ? (
                <>
                  <T v="hero" color="#F7F4EC" style={{ fontSize: 68, lineHeight: 70 }}>{big.n}</T>
                  <T v="small" color={tint('#F7F4EC', 0.7)}>{big.unit}</T>
                </>
              ) : <Icon ios="checkmark.seal.fill" android="verified" size={54} color={col} />}
            </Ring>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <T v="h2" color="#F7F4EC" style={{ textAlign: 'center' }}>{top.title}</T>
              {top.date && <T v="small" color={col}>{full(top.date)} · {inDays(top.days ?? 0)}</T>}
              <T v="small" color={tint('#F7F4EC', 0.72)} style={{ textAlign: 'center' }} numberOfLines={3}>{top.note}</T>
            </View>
          </Animated.View>
        </Tap>
      ) : (
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }}>
          <Icon ios="calendar.badge.plus" android="event" size={34} color={c.accent} />
          <T v="h2">Add your first date</T>
          <T muted style={{ textAlign: 'center' }}>Your I-94, passport or work permit is a good start.</T>
          <Tap onPress={() => router.push({ pathname: '/person', params: { id: personId ?? 'new' } })}><T v="strong" color={c.accent}>Add dates</T></Tap>
        </Card>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        <Action ios="briefcase" android="work_off" label="My job ended" onPress={() => router.push({ pathname: '/job', params: { person: personId, mode: 'end' } })} />
        <Action ios="briefcase.fill" android="work" label="New job" onPress={() => router.push({ pathname: '/job', params: { person: personId, mode: 'start' } })} />
        <Action ios="airplane.departure" android="flight_takeoff" label="Add a trip" onPress={() => router.push({ pathname: '/trip', params: { person: personId } })} />
        <Action ios="checklist" android="checklist" label="Before you fly" onPress={() => router.push({ pathname: '/fly', params: { person: personId } })} />
        <Action ios="calendar" android="edit_calendar" label="Edit dates" onPress={() => router.push({ pathname: '/person', params: { id: personId } })} />
      </ScrollView>

      {rest.length > 0 && <T v="label" style={{ marginTop: 6 }}>Coming up</T>}
      {rest.map((x, i) => (
        <Animated.View key={`${x.personId}-${x.id}`} entering={FadeInDown.delay(80 + i * 50)}>
          <ClockCard clock={x} who={people.length > 1 && who === 'all' ? name(x.personId) : undefined} locked={x.plus && !plus} />
        </Animated.View>
      ))}

      <T v="small" muted style={{ textAlign: 'center', marginTop: 10 }}>Manendi gives information, not legal advice. Each clock links its official source.</T>
    </Screen>
  );
}
