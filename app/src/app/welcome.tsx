import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from '@/components/brand';
import { Ring } from '@/components/ring';
import { Button, Icon, T, Tap } from '@/components/ui';
import { font, tint, useColors, type Palette } from '@/lib/theme';

const bob = (ms: number, px: number, delay = 0) => ({
  animationName: { from: { transform: [{ translateY: -px }] }, to: { transform: [{ translateY: px }] } },
  animationDuration: ms, animationDelay: delay, animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const, animationTimingFunction: 'ease-in-out' as const,
});

function ClockArt({ c }: { c: Palette }) {
  return (
    <View style={{ width: 280, height: 230, alignItems: 'center', justifyContent: 'center' }}>
      <Ring size={196} progress={0.63} color={c.accent} track={c.line}>
        <Text style={{ fontFamily: font.display, fontSize: 64, lineHeight: 66, color: c.text }}>57</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 13, color: c.muted }}>days of grace left</Text>
      </Ring>
      {[['I-94', 8, 20, c.gold], ['EAD', 222, 36, c.alt], ['OPT', 196, 178, c.accent]].map(([t, x, y, col], i) => (
        <Animated.View key={t as string} style={[a.chip, { left: x as number, top: y as number, backgroundColor: c.card, borderColor: tint(col as string, 0.5) }, bob(2400 + i * 400, 4, i * 300)]}>
          <Text style={{ fontFamily: font.heavy, fontSize: 12, color: col as string }}>{t}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function CasesArt({ c }: { c: Palette }) {
  const rows = [['IOE0912345678', 'Case Was Received', c.muted], ['EAC2290012345', 'Fingerprints Were Taken', c.gold], ['LIN2512345678', 'Case Was Approved', c.accent]] as const;
  return (
    <View style={{ width: 290, height: 230, justifyContent: 'center', gap: 10 }}>
      {rows.map(([r, s, col], i) => (
        <Animated.View key={r} style={[a.case, { backgroundColor: c.card, borderColor: c.line }, {
          animationName: { from: { opacity: 0, transform: [{ translateX: 40 }] }, '25%': { opacity: 1, transform: [{ translateX: 0 }] }, to: { opacity: 1, transform: [{ translateX: 0 }] } },
          animationDuration: 3800, animationDelay: i * 260, animationIterationCount: 'infinite', animationTimingFunction: 'ease-out',
        }]}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.heavy, fontSize: 12, letterSpacing: 1, color: c.muted }}>{r}</Text>
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: c.text }}>{s}</Text>
          </View>
          {i === 2 && <Icon ios="checkmark.seal.fill" android="verified" size={20} color={c.accent} />}
        </Animated.View>
      ))}
    </View>
  );
}

function RadarArt({ c }: { c: Palette }) {
  return (
    <View style={{ width: 280, height: 230, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: tint(c.accent, 0.6),
          animationName: { from: { opacity: 0.9, transform: [{ scale: 0.4 }] }, to: { opacity: 0, transform: [{ scale: 2.4 }] } },
          animationDuration: 3600, animationDelay: i * 1200, animationIterationCount: 'infinite', animationTimingFunction: 'ease-out',
        }} />
      ))}
      <Mark size={64} />
      {[['H-1B fee rule', 0, 26, c.alt], ['OPT', 196, 64, c.gold], ['Work permits', 30, 176, c.accent]].map(([t, x, y, col], i) => (
        <Animated.View key={t as string} style={[a.chip, { left: x as number, top: y as number, backgroundColor: tint(col as string, 0.14), borderColor: 'transparent' }, bob(2600 + i * 300, 5, i * 500)]}>
          <Text style={{ fontFamily: font.heavy, fontSize: 12, color: col as string }}>{t}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const SLIDES = [
  { title: 'Know your days.', body: 'I-94, work permit, OPT, grace periods: every date that keeps you in status, counted down for you.', Art: ClockArt },
  { title: 'Every case, one glance.', body: 'Your family’s USCIS cases, each step explained in plain English.', Art: CasesArt },
  { title: 'Hear what changes.', body: 'New rules and fees that touch your visa, straight from the Federal Register. Nothing else.', Art: RadarArt },
];

function Dot({ x, i, width, color }: { x: SharedValue<number>; i: number; width: number; color: string }) {
  const st = useAnimatedStyle(() => {
    const d = Math.abs(x.get() / width - i);
    return { width: interpolate(d, [0, 1], [28, 8], 'clamp'), opacity: interpolate(d, [0, 1], [1, 0.3], 'clamp') };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: color }, st]} />;
}

function Slide({ x, i, width, c, slide }: { x: SharedValue<number>; i: number; width: number; c: Palette; slide: (typeof SLIDES)[number] }) {
  const parallax = useAnimatedStyle(() => ({ transform: [{ translateX: (x.get() - i * width) * 0.25 }] }));
  return (
    <View style={{ width, paddingHorizontal: 28, justifyContent: 'center', gap: 16, overflow: 'hidden' }}>
      <Animated.View style={[{ alignItems: 'center', marginBottom: 14 }, parallax]}><slide.Art c={c} /></Animated.View>
      <T v="hero">{slide.title}</T>
      <T v="body" muted style={{ fontSize: 18, lineHeight: 26 }}>{slide.body}</T>
    </View>
  );
}

export default function Welcome() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { x.set(e.contentOffset.x); });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
      <View style={{ paddingHorizontal: 28 }}><Mark size={52} /></View>
      <Animated.ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1 }}>
        {SLIDES.map((slide, i) => <Slide key={slide.title} x={x} i={i} width={width} c={c} slide={slide} />)}
      </Animated.ScrollView>
      <View style={{ paddingHorizontal: 24, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'center', marginBottom: 8 }}>
          {SLIDES.map((sl, i) => <Dot key={sl.title} x={x} i={i} width={width} color={c.text} />)}
        </View>
        <Button title="Start" kind="accent" onPress={() => router.push('/setup')} />
        <Tap onPress={() => router.push('/restore')} accessibilityLabel="Restore my household" style={{ alignSelf: 'center', paddingVertical: 4 }}>
          <T v="strong" color={c.accent}>Restore my household</T>
        </Tap>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon ios="lock.fill" android="lock" size={12} color={c.muted} />
          <T v="small" muted>No account needed. Your details stay on this phone.</T>
        </View>
      </View>
    </View>
  );
}

const a = StyleSheet.create({
  chip: { position: 'absolute', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1.5, boxShadow: '0 6px 18px rgba(15,27,45,0.10)' },
  case: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, boxShadow: '0 8px 24px rgba(15,27,45,0.08)' },
});
