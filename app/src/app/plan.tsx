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
import { joined, t } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { brand, font, tint, useColors } from '@/lib/theme';

const legal = t(Platform.OS === 'ios' ? 'plan.legal.ios' : 'plan.legal.android');

type Perk = [string, string, string, string];
// Change alerts need live USCIS status (production keys, after USCIS's demo): never promise them before then.
const CASES: Perk = ['tray.full.fill', 'inbox', t('plan.perk.cases.title'), t('plan.perk.cases.sub')];
const WATCHED: Perk = ['tray.full.fill', 'inbox', t('plan.perk.watched.title'), t('plan.perk.watched.sub')];
const PERKS: Perk[] = [
  ['person.2.fill', 'group', t('plan.perk.household.title'), t('plan.perk.household.sub')],
  CASES,
  ['airplane', 'flight', t('plan.perk.travel.title'), t('plan.perk.travel.sub')],
  ['hourglass', 'hourglass_top', t('plan.perk.h1b.title'), t('plan.perk.h1b.sub')],
  ['lock.doc.fill', 'lock', t('plan.perk.vault.title'), t(Platform.OS === 'ios' ? 'plan.perk.vault.sub.ios' : 'plan.perk.vault.sub.android')],
  ['doc.richtext', 'picture_as_pdf', t('plan.perk.report.title'), t('plan.perk.report.sub')],
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

  const unlock = () => { if (code?.trim() && !busy) run('code', () => api<PlanView>('/billing/code', { body: { code } }), t('plan.badCode')); };

  const lightBar = Platform.OS === 'android' ? <StatusBar style="light" /> : null;
  if (done) {
    return (
      <View style={[st.done, { backgroundImage: `linear-gradient(160deg, ${brand.ink2}, ${brand.ink})` }]}>
        {lightBar}
        <Animated.View entering={ZoomIn.springify().damping(10)}><Mark size={140} animated /></Animated.View>
        <Animated.Text entering={FadeInDown.delay(500)} style={st.doneTitle}>{t('plan.welcome')}</Animated.Text>
        <Animated.Text entering={FadeIn.delay(800)} style={st.doneSub}>{t('plan.welcome.sub')}</Animated.Text>
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
            <Tap onPress={() => router.back()} accessibilityLabel={t('plan.close')} style={st.close}>
              <Icon ios="xmark" android="close" size={15} color="#FFFFFF" />
            </Tap>
          </Row>
          <Text style={st.kicker}>MANENDI PLUS</Text>
          <Animated.Text entering={FadeInDown.delay(150).springify()} style={st.title}>{t('plan.title')}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250)} style={st.sub}>{t('plan.sub')}</Animated.Text>
        </View>

        <View style={{ padding: 22, gap: 16 }}>
          {plus && (
            <Animated.View entering={FadeInDown} style={[st.active, { backgroundColor: tint(c.good, 0.12), borderColor: tint(c.good, 0.4) }]}>
              <Row><Icon ios="checkmark.seal.fill" android="verified" size={22} color={c.good} /><T v="strong">{t('plan.active')}</T></Row>
              <T v="small" muted>
                {data.plan.until ? t('plan.until', { date: full(data.plan.until.slice(0, 10)) }) : ''}
                {data.plan.source === 'dev' ? ` ${t('plan.testPlan')}` : ''}
              </T>
              {data.plan.source === 'store' && <Button title={t('plan.manage')} kind="soft" style={{ height: 46 }} onPress={() => Linking.openURL(manageUrl)} />}
              {data.plan.source === 'dev' && testMode && (
                <Button title={t('plan.endTest')} kind="soft" style={{ height: 46 }}
                  onPress={async () => { setPlan(await api<PlanView>('/billing/dev-grant', { body: { period: 'off' } })); toast(t('plan.backOnFree')); }} />
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
                    <Tap key={o.period} onPress={() => setPeriod(o.period)} accessibilityState={{ selected: on }}
                      accessibilityLabel={t(o.period === 'annual' ? 'plan.option.annual' : 'plan.option.monthly', { price: o.price })}
                      style={[st.option, { backgroundColor: c.card, borderColor: on ? c.text : c.line, borderWidth: on ? 2 : 1 }]}>
                      <View style={[st.radio, { borderColor: on ? c.text : c.line }]}>{on && <View style={[st.dot, { backgroundColor: c.text }]} />}</View>
                      <View style={{ flex: 1 }}>
                        <T v="strong">{o.period === 'annual' ? t('plan.yearly') : t('plan.monthly')}</T>
                        <T v="small" muted>
                          {o.period === 'annual'
                            ? (o.perMonth ? t('plan.price.yearMonth', { price: o.price, perMonth: o.perMonth }) : t('plan.price.year', { price: o.price }))
                            : t('plan.price.month', { price: o.price })}
                        </T>
                      </View>
                      {o.period === 'annual' && save ? <View style={[st.save, { backgroundColor: c.accent }]}><Text style={[st.saveText, { color: c.onAccent }]}>{t('plan.saveBadge', { pct: save })}</Text></View> : null}
                    </Tap>
                  );
                })}
              </View>
              <Button title={chosen ? t(chosen.period === 'annual' ? 'plan.start.annual' : 'plan.start.monthly', { price: chosen.price }) : t('plan.start')} kind="accent"
                loading={busy === 'buy' || !offers.length} disabled={!chosen || !!busy} onPress={() => chosen && run('buy', () => buy(chosen), t('plan.notActive'))} />
              {testMode && (
                <View style={[st.test, { backgroundColor: tint(c.gold, 0.14) }]}>
                  <Icon ios="testtube.2" android="science" size={16} color={c.gold} />
                  <T v="small" style={{ flex: 1 }}>{t('plan.testMode')}</T>
                </View>
              )}
            </>
          )}

          <Tap haptic={false} disabled={!!busy} onPress={() => run('restore', restore, t('plan.nothingToRestore'))} style={{ alignSelf: 'center' }}>
            <T v="small" color={c.text}>{busy === 'restore' ? t('plan.restoring') : t('plan.restore')}</T>
          </Tap>
          {/* Play reviewers can't buy, so Play Console › Sign in details gives them a code. Android only: Apple bans unlock codes (3.1.1). */}
          {Platform.OS === 'android' && !plus && (code === null ? (
            <Tap haptic={false} onPress={() => setCode('')} style={{ alignSelf: 'center' }}>
              <T v="small" muted>{t('plan.haveCode')}</T>
            </Tap>
          ) : (
            <Animated.View entering={FadeInDown} style={{ gap: 10 }}>
              <Field label={t('plan.code')} value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} autoFocus returnKeyType="go" onSubmitEditing={unlock} />
              <Button title={t('plan.unlock')} kind="soft" style={{ height: 46 }} loading={busy === 'code'} disabled={!code.trim() || !!busy} onPress={unlock} />
            </Animated.View>
          ))}
          <T v="small" muted style={{ textAlign: 'center', fontSize: 11, lineHeight: 16 }}>
            {legal}{' '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => openPage('terms')}>{t('plan.terms')}</Text>
            {' · '}
            <Text style={{ textDecorationLine: 'underline' }} onPress={() => openPage('privacy')}>{t('plan.privacy')}</Text>
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
  title: { fontFamily: font.display, fontSize: 50, lineHeight: joined ? undefined : 52, color: '#FFFFFF', letterSpacing: joined ? 0 : -0.5 },
  sub: { fontFamily: font.semi, fontSize: 15, lineHeight: joined ? undefined : 22, color: 'rgba(255,255,255,0.78)' },
  perk: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  save: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  saveText: { fontFamily: font.heavy, fontSize: 11, letterSpacing: joined ? 0 : 0.6 },
  active: { borderRadius: 22, borderWidth: 1.5, padding: 16, gap: 8 },
  test: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24 },
  doneTitle: { fontFamily: font.display, fontSize: 40, lineHeight: joined ? undefined : 44, color: '#FFFFFF', textAlign: 'center' },
  doneSub: { fontFamily: font.semi, fontSize: 16, color: 'rgba(255,255,255,0.8)' },
});
