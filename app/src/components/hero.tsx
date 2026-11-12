import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { headline } from '@/components/clock-card';
import { Ring } from '@/components/ring';
import { CountUp, Icon, Row, T, Tap } from '@/components/ui';
import { full } from '@/lib/dates';
import { inDays, type Clock } from '@/lib/rules';
import { brand, levelColor, tint, useColors } from '@/lib/theme';

const LEVEL = { over: 'Past due', urgent: 'Act now', soon: 'Coming up', ok: 'On track', info: 'Good to know' } as const;
const INK = '#F7F4EC';
const GAP = 12;

function Page({ clock, label, i, x, step, w, active }: {
  clock: Clock; label: string; i: number; x: SharedValue<number>; step: number; w: number; active: boolean;
}) {
  const c = useColors();
  const col = levelColor(c, clock.level);
  const big = headline(clock);
  const range = [(i - 1) * step, i * step, (i + 1) * step];
  const card = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, range, [0.55, 1, 0.55], 'clamp'),
    transform: [{ scale: interpolate(x.value, range, [0.92, 1, 0.92], 'clamp') }],
  }));
  // The ring trails the card and shrinks a little as it leaves: parallax you can feel under the thumb.
  const ring = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, range, [-w * 0.16, 0, w * 0.16], 'clamp') }, { scale: interpolate(x.value, range, [0.82, 1, 0.82], 'clamp') }],
  }));
  return (
    <Tap onPress={() => router.push({ pathname: '/clock', params: { person: clock.personId, id: clock.id } })}
      accessibilityLabel={`${label}: ${clock.title}${big ? `, ${big.n} ${big.unit}` : ''}`} style={{ width: w }}>
      <Animated.View style={[card, {
        borderRadius: 32, padding: 22, gap: 16, overflow: 'hidden', alignItems: 'center',
        backgroundImage: `linear-gradient(160deg, ${brand.ink2}, ${brand.ink})`, boxShadow: '0 18px 40px rgba(15,27,45,0.28)',
      }]}>
        {/* A glow in the level's colour drifts behind the ring, so the card never sits dead still. */}
        <Animated.View style={{
          position: 'absolute', width: 320, height: 320, borderRadius: 160, right: -120, top: -140,
          backgroundImage: `radial-gradient(circle, ${tint(col, 0.38)} 0%, ${tint(col, 0)} 70%)`,
          animationName: { from: { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] }, to: { transform: [{ translateX: -70 }, { translateY: 60 }, { scale: 1.3 }] } },
          animationDuration: 5200, animationIterationCount: 'infinite', animationDirection: 'alternate', animationTimingFunction: 'ease-in-out',
        }} />
        <Row style={{ alignSelf: 'stretch', justifyContent: 'space-between' }}>
          <T v="label" color={tint(INK, 0.7)}>{label}</T>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: tint(col, 0.22) }}>
            <T v="label" color={col} style={{ fontSize: 10.5 }}>{LEVEL[clock.level]}</T>
          </View>
        </Row>
        <Animated.View style={ring}>
          {/* Re-keyed whenever this card becomes the current one: the ring refills and the number rolls up again. */}
          <Ring key={String(active)} size={210} progress={clock.progress ?? (clock.level === 'ok' ? 1 : 0.5)} color={col} track="rgba(255,255,255,0.12)">
            {big ? (
              <>
                <CountUp value={big.value} v="hero" color={INK} style={{ fontSize: 68, lineHeight: 70 }} />
                <T v="small" color={tint(INK, 0.7)}>{big.unit}</T>
              </>
            ) : <Icon ios="checkmark.seal.fill" android="verified" size={54} color={col} />}
          </Ring>
        </Animated.View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <T v="h2" color={INK} style={{ textAlign: 'center' }}>{clock.title}</T>
          {clock.date && <T v="small" color={col}>{full(clock.date)} · {inDays(clock.days ?? 0)}</T>}
          <T v="small" color={tint(INK, 0.72)} style={{ textAlign: 'center' }} numberOfLines={3}>{clock.note}</T>
        </View>
      </Animated.View>
    </Tap>
  );
}

function Dot({ i, x, step, color }: { i: number; x: SharedValue<number>; step: number; color: string }) {
  const st = useAnimatedStyle(() => {
    const k = Math.max(0, 1 - Math.abs(x.value / step - i));
    return { width: 7 + 16 * k, opacity: 0.3 + 0.7 * k };
  });
  return <Animated.View style={[{ height: 7, borderRadius: 4, backgroundColor: color }, st]} />;
}

/** The most pressing dates as a deck you can swipe through; the next card peeks in from the right. */
export function Hero({ clocks, label }: { clocks: Clock[]; label: (clock: Clock, i: number) => string }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const many = clocks.length > 1;
  const w = width - (many ? 56 : 40);
  const step = w + GAP;
  const x = useSharedValue(0);
  const [page, setPage] = useState(0);
  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });
  if (!many) return <Page clock={clocks[0]} label={label(clocks[0], 0)} i={0} x={x} step={step} w={w} active />;
  return (
    <View style={{ gap: 12 }}>
      <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}
        snapToInterval={step} decelerationRate="fast" disableIntervalMomentum
        // Room above and below for the card's shadow (a scroll view clips it), handed back with negative margins.
        style={{ marginHorizontal: -20, marginTop: -24, marginBottom: -48 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48, gap: GAP }}
        onMomentumScrollEnd={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / step);
          if (p !== page) { Haptics.selectionAsync(); setPage(p); }
        }}>
        {clocks.map((k, i) => <Page key={`${k.personId}-${k.id}`} clock={k} label={label(k, i)} i={i} x={x} step={step} w={w} active={page === i} />)}
      </Animated.ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessible accessibilityLabel={`Card ${page + 1} of ${clocks.length}`}>
        {clocks.map((k, i) => <Dot key={`${k.personId}-${k.id}`} i={i} x={x} step={step} color={c.text} />)}
      </View>
    </View>
  );
}
