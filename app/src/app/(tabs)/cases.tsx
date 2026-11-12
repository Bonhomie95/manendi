import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card, Icon, Row, Screen, T, Tap } from '@/components/ui';
import { full } from '@/lib/dates';
import { FORMS, explain } from '@/lib/meta';
import { useStore } from '@/lib/store';
import { font, tint, useColors } from '@/lib/theme';

export default function Cases() {
  const c = useColors();
  const { data, watches, live, sync, syncing } = useStore();
  const items = data.cases.map((k) => {
    const w = watches.find((x) => x.receipt === k.receipt);
    return { k, w, status: w?.status ?? k.log[0]?.status ?? null, date: w?.modified ?? k.log[0]?.date ?? null };
  });
  const who = (id: string) => data.people.find((p) => p.id === id)?.name ?? '';

  return (
    <Screen onRefresh={sync} refreshing={syncing}>
      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <T v="title">Cases</T>
        <Tap onPress={() => router.push('/case')} accessibilityLabel="Add a case"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios="plus" android="add" size={18} color={c.bg} />
        </Tap>
      </Row>

      {!live.on && (
        <Card style={{ backgroundColor: tint(c.gold, 0.1), borderColor: tint(c.gold, 0.3), flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Icon ios="antenna.radiowaves.left.and.right" android="sensors" size={18} color={c.gold} />
          <T v="small" style={{ flex: 1 }}>Live USCIS status is on its way. Until it switches on, tap a case → Check on USCIS, then log the update here. Your cases will light up on their own.</T>
        </Card>
      )}
      {live.mock && <T v="small" color={c.warn}>Test mode: statuses are made up, not from USCIS.</T>}

      {items.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 30 }}>
          <Icon ios="tray" android="inbox" size={34} color={c.accent} />
          <T v="h2">No cases yet</T>
          <T muted style={{ textAlign: 'center' }}>Add the receipt number from any USCIS notice. It looks like IOE0912345678.</T>
          <Tap onPress={() => router.push('/case')}><T v="strong" color={c.accent}>Add a receipt number</T></Tap>
        </Card>
      ) : items.map(({ k, w, status, date }, i) => {
        const ex = explain(status);
        const rfe = /evidence was sent|denied/i.test(status ?? '');
        return (
          <Animated.View key={k.receipt} entering={FadeInDown.delay(i * 60)}>
            <Tap onPress={() => router.push({ pathname: '/case', params: { receipt: k.receipt } })} accessibilityLabel={`${k.label || k.receipt}, ${status ?? 'no status yet'}`}>
              <Card style={{ gap: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T style={{ fontFamily: font.heavy, letterSpacing: 1.4, fontSize: 13 }} muted>{k.receipt}</T>
                  {w?.form && <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9, backgroundColor: c.soft }}>
                    <T v="small" style={{ fontSize: 11.5 }}>{w.form}{FORMS[w.form] ? ` · ${FORMS[w.form]}` : ''}</T>
                  </View>}
                </Row>
                <T v="strong">{k.label || who(k.personId)}</T>
                <Row style={{ gap: 8, alignItems: 'flex-start' }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, marginTop: 5, backgroundColor: !status ? c.line : rfe ? c.alt : /approved|delivered|mailed|produced/i.test(status) ? c.accent : c.gold }} />
                  <View style={{ flex: 1 }}>
                    <T v="small" style={{ fontSize: 14 }}>{status ?? 'No status yet'}</T>
                    {ex && <T v="small" muted>{ex.meaning}</T>}
                  </View>
                </Row>
                {date && <T v="small" muted style={{ fontSize: 11.5 }}>Updated {full(date)}</T>}
              </Card>
            </Tap>
          </Animated.View>
        );
      })}
    </Screen>
  );
}
