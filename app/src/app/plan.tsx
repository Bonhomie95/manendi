import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from '@/components/brand';
import { Button, Field, Icon, Row, T, Tap, toast } from '@/components/ui';
import { api, openPage, type PlanView } from '@/lib/api';
import { buy, getOffers, manageUrl, restore, testMode, type Offer } from '@/lib/billing';
import { full } from '@/lib/dates';
import { LOCK } from '@/lib/meta';
import { useStore } from '@/lib/store';
import { brand, font, tint, useColors } from '@/lib/theme';

const store = Platform.OS === 'ios' ? 'Apple Account' : 'Google Play account';

type Perk = [string, string, string, string];
// Change alerts need live USCIS status (production keys, after USCIS's demo): never promise them before then.
const CASES: Perk = ['tray.full.fill', 'inbox', 'Every case, in one place', 'Unlimited receipt numbers, every step explained in plain English.'];
const WATCHED: Perk = ['tray.full.fill', 'inbox', 'Every case, watched', 'Unlimited receipt numbers, and an alert the moment one changes.'];
const PERKS: Perk[] = [
  ['person.2.fill', 'group', 'Your whole household', 'Spouse, kids, parents: every visa in the house, each with its own clocks.'],
  CASES,
  ['airplane', 'flight', 'Citizenship travel budget', 'How many days abroad you can still spend, plus long-trip warnings.'],
  ['hourglass', 'hourglass_top', 'H-1B limit & green card queue', 'Six years plus every day you can win back, and your place in line.'],
  ['lock.doc.fill', 'lock', 'Document vault', `Passports, I-797s and cards behind ${LOCK}. They never leave your phone.`],
  ['doc.richtext', 'picture_as_pdf', 'Status report', 'Every date and case on one clean page for your attorney or HR.'],
];

export default function Plan() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { plus, data, live, setPlan, sync } = useStore();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [period, setPeriod] = useState<Offer['period']>('annual');
  const [busy, setBusy] = useState<'buy' | 'restore' | 'code' | null>(null);
  const [code, setCode] = useState<string | null>(null); // null = the code field is closed
  const [done, setDone] = useState(false);
  useEffect(() => { Promise.all([getOffers(), sync()]).then(([o]) => setOffers(o)); }, [sync]);
  // Android: a dark strip fades in behind the status bar once the hero scrolls away, so its light icons stay readable.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const scrim = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [80, 220], [0, 1], 'clamp') }));

  const chosen = offers.find((o) => o.period === period) ?? offers[0];
  const annual = offers.find((o) => o.period === 'annual');
  const monthly = offers.find((o) => o.period === 'monthly');
  const save = annual?.amount && monthly?.amount ? Math.round((1 - annual.amount / (monthly.amount * 12)) * 100) : null;

  async function run(kind: 'buy' | 'restore' | 'code', fn: () => Promise<PlanView | null>, ok: string) {
    setBusy(kind);
    try {
      const p = await fn();
      if (!p) return; // cancelled the store sheet
      setPlan(p);
      if (p.plus) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDone(true);
        setTimeout(() => router.back(), 1600);
      } else toast(ok);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const unlock = () => { if (code?.trim() && !busy) run('code', () => api<PlanView>('/billing/code', { body: { code } }), 'That code doesn’t work.'); };

  const lightBar = Platform.OS === 'android' ? <StatusBar style="light" /> : null;
  if (done) {
    return (
      <View style={[st.done, { backgroundImage: `linear-gradient(160deg, ${brand.ink2}, ${brand.ink})` }]}>
        {lightBar}
        <Animated.View entering={ZoomIn.springify().damping(10)}><Mark size={140} animated /></Animated.View>
        <Animated.Text entering={FadeInDown.delay(500)} style={st.doneTitle}>Welcome to{'\n'}Manendi Plus.</Animated.Text>
        <Animated.Text entering={FadeIn.delay(800)} style={st.doneSub}>Your whole household is covered.</Animated.Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {lightBar}
        <View style={[st.hero, { paddingTop: 22 + (Platform.OS === 'android' ? insets.top : 0), backgroundImage: `linear-gradient(160deg, ${brand.ink2}, ${brand.ink})` }]}>
          <View style={[st.glow, { backgroundImage: `radial-gradient(circle, ${tint(brand.gold, 0.35)} 0%, ${tint(brand.gold, 0)} 70%)` }]} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Mark size={62} animated />
            <Tap onPress={() => router.back()} accessibilityLabel="Close" style={st.close}>
              <Icon ios="xmark" android="close" size={15} color="#FFFFFF" />
            </Tap>
          </Row>
          <Text style={st.kicker}>MANENDI PLUS</Text>
          <Animated.Text entering={FadeInDown.delay(150).springify()} style={st.title}>Stay sure.{'\n'}All of you.</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250)} style={st.sub}>
            Every date, case and trip for your whole household: counted, watched, and kept on your phone.
          </Animated.Text>
        </View>

        <View style={{ padding: 22, gap: 16 }}>
          {plus && (
            <Animated.View entering={FadeInDown} style={[st.active, { backgroundColor: tint(c.good, 0.12), borderColor: tint(c.good, 0.4) }]}>
              <Row><Icon ios="checkmark.seal.fill" android="verified" size={22} color={c.good} /><T v="strong">You’re on Manendi Plus</T></Row>
              <T v="small" muted>
                {data.plan.until ? `Covered through ${full(data.plan.until.slice(0, 10))}.` : ''}
                {data.plan.source === 'dev' ? ' Test plan — no real charge.' : ''}
              </T>
              {data.plan.source === 'store' && <Button title="Manage subscription" kind="soft" style={{ height: 46 }} onPress={() => Linking.openURL(manageUrl)} />}
              {data.plan.source === 'dev' && testMode && (
                <Button title="End test plan" kind="soft" style={{ height: 46 }}
                  onPress={async () => { setPlan(await api<PlanView>('/billing/dev-grant', { body: { period: 'off' } })); toast('Back on Free.'); }} />
              )}
            </Animated.View>
          )}

          {PERKS.map((p) => (live.on && p === CASES ? WATCHED : p)).map(([ios, android, title, sub], i) => (
            <Animated.View key={title} entering={FadeInDown.delay(300 + i * 70).springify()}>
              <Row style={{ gap: 14, alignItems: 'flex-start' }}>
                <View style={[st.perk, { backgroundColor: tint([c.accent, c.gold, c.alt][i % 3], 0.15) }]}>
                  <Icon ios={ios} android={android} size={19} color={[c.accent, c.gold, c.alt][i % 3]} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="strong">{title}</T>
                  <T v="small" muted>{sub}</T>
                </View>
              </Row>
            </Animated.View>
          ))}

          {!plus && (
            <>
              <View style={{ gap: 10, marginTop: 6 }}>
                {offers.map((o) => {
                  const on = o.period === chosen?.period;
                  return (
                    <Tap key={o.period} onPress={() => setPeriod(o.period)} accessibilityState={{ selected: on }} accessibilityLabel={`${o.period} plan ${o.price}`}
                      style={[st.option, { backgroundColor: c.card, borderColor: on ? c.text : c.line, borderWidth: on ? 2 : 1 }]}>
                      <View style={[st.radio, { borderColor: on ? c.text : c.line }]}>{on && <View style={[st.dot, { backgroundColor: c.text }]} />}</View>
                      <View style={{ flex: 1 }}>
                        <T v="strong">{o.period === 'annual' ? 'Yearly' : 'Monthly'}</T>
                        <T v="small" muted>{o.period === 'annual' ? `${o.price} a year${o.perMonth ? ` · ${o.perMonth}/mo` : ''}` : `${o.price} a month`}</T>
                      </View>
                      {o.period === 'annual' && save ? <View style={[st.save, { backgroundColor: c.accent }]}><Text style={[st.saveText, { color: c.onAccent }]}>SAVE {save}%</Text></View> : null}
                    </Tap>
                  );
                })}
              </View>
              <Button title={chosen ? `Start Plus · ${chosen.price}${chosen.period === 'annual' ? '/yr' : '/mo'}` : 'Start Manendi Plus'} kind="accent"
                loading={busy === 'buy' || !offers.length} disabled={!chosen || !!busy} onPress={() => chosen && run('buy', () => buy(chosen), 'Not active yet — try Restore.')} />
              {testMode && (
                <View style={[st.test, { backgroundColor: tint(c.gold, 0.14) }]}>
                  <Icon ios="testtube.2" android="science" size={16} color={c.gold} />
                  <T v="small" style={{ flex: 1 }}>Test mode — no charge. Add your RevenueCat keys to sell for real.</T>
                </View>
              )}
            </>
          )}

          <Tap haptic={false} disabled={!!busy} onPress={() => run('restore', restore, 'No purchases to restore.')} style={{ alignSelf: 'center' }}>
            <T v="small" color={c.text}>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</T>
          </Tap>
          {/* Play reviewers can't buy, so Play Console › Sign in details gives them a code. Android only: Apple bans unlock codes (3.1.1). */}
          {Platform.OS === 'android' && !plus && (code === null ? (
            <Tap haptic={false} onPress={() => setCode('')} style={{ alignSelf: 'center' }}>
              <T v="small" muted>Have a code?</T>
            </Tap>
          ) : (
            <Animated.View entering={FadeInDown} style={{ gap: 10 }}>
              <Field label="Code" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} autoFocus returnKeyType="go" onSubmitEditing={unlock} />
              <Button title="Unlock Plus" kind="soft" style={{ height: 46 }} loading={busy === 'code'} disabled={!code.trim() || !!busy} onPress={unlock} />
            </Animated.View>
          ))}
          <T v="small" muted style={{ textAlign: 'center', fontSize: 11, lineHeight: 16 }}>
            Billed to your {store}. Auto-renews at the price above until cancelled. Cancel anytime at least 24 hours before renewal in your {store} settings.{' '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => openPage('terms')}>Terms</Text>
            {' · '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => openPage('privacy')}>Privacy</Text>
          </T>
        </View>
      </Animated.ScrollView>
      {Platform.OS === 'android' && <Animated.View pointerEvents="none" style={[st.scrim, { height: insets.top }, scrim]} />}
    </View>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 22, paddingBottom: 28, gap: 10, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' },
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, right: -110, top: -120 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: brand.ink },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.6, color: brand.gold, marginTop: 10 },
  title: { fontFamily: font.display, fontSize: 50, lineHeight: 52, color: '#FFFFFF', letterSpacing: -0.5 },
  sub: { fontFamily: font.semi, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.78)' },
  perk: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  save: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  saveText: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 0.6 },
  active: { borderRadius: 22, borderWidth: 1.5, padding: 16, gap: 8 },
  test: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 },
  doneTitle: { fontFamily: font.display, fontSize: 40, lineHeight: 44, color: '#FFFFFF', textAlign: 'center' },
  doneSub: { fontFamily: font.semi, fontSize: 16, color: 'rgba(255,255,255,0.8)' },
});
