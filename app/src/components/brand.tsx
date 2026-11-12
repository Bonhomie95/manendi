import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { cubicBezier, type CSSAnimationKeyframes } from 'react-native-reanimated';
import { brand, font, tint } from '@/lib/theme';

export type MarkColors = { ring: string; arch: string; dot: string };
const BRAND: MarkColors = { ring: brand.gold, arch: brand.mint, dot: brand.stamp };

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
const pop = cubicBezier(0.34, 1.56, 0.64, 1);
const glide = cubicBezier(0.2, 0.8, 0.2, 1);

/**
 * The Manendi mark — same geometry as scripts/brand.mjs, in the ring's own 784×784 box.
 * A seal with a quarter missing (the clock still running), a doorway, and you inside it: staying.
 */
export function Mark({ size = 120, colors = BRAND, animated = false, delay = 0 }: {
  size?: number; colors?: MarkColors; animated?: boolean; delay?: number;
}) {
  const s = size / 784;
  const enter = (from: CSSAnimationKeyframes['from'], to: CSSAnimationKeyframes['to'], ms: number, at: number, ease = pop) => animated ? {
    animationName: { from, to }, animationDuration: ms, animationDelay: delay + at, animationFillMode: 'both' as const, animationTimingFunction: ease,
  } : {};
  return (
    <View style={{ width: size, height: size }} accessible accessibilityRole="image" accessibilityLabel="Manendi">
      {animated && (
        <Animated.View style={{
          position: 'absolute', left: -size * 0.2, top: -size * 0.2, width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7,
          backgroundImage: `radial-gradient(circle, ${tint(colors.ring, 0.55)} 0%, ${tint(colors.ring, 0)} 66%)`,
          animationName: { from: { opacity: 0, transform: [{ scale: 0.4 }] }, '45%': { opacity: 1 }, to: { opacity: 0, transform: [{ scale: 1.6 }] } },
          animationDuration: 1800, animationDelay: delay + 500, animationFillMode: 'both', animationTimingFunction: glide,
        }} />
      )}
      {/* Per-side border colours on a circle draw quarter arcs; the clear top quarter, turned 45°, is the gap. */}
      <Animated.View style={[{
        position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 64 * s,
        borderColor: colors.ring, borderTopColor: 'transparent', transform: [{ rotate: '45deg' }],
      }, enter({ opacity: 0, transform: [{ rotate: '-75deg' }, { scale: 0.82 }] }, { opacity: 1, transform: [{ rotate: '45deg' }, { scale: 1 }] }, 1100, 0)]} />
      <Animated.View style={[{
        position: 'absolute', left: 242 * s, top: 232 * s, width: 300 * s, height: 360 * s, borderWidth: 64 * s, borderBottomWidth: 0,
        borderColor: colors.arch, borderTopLeftRadius: 150 * s, borderTopRightRadius: 150 * s,
      }, enter({ opacity: 0, transform: [{ translateY: 90 * s }] }, { opacity: 1, transform: [{ translateY: 0 }] }, 800, 260, glide)]} />
      <Animated.View style={[{
        position: 'absolute', left: 346 * s, top: 474 * s, width: 92 * s, height: 92 * s, borderRadius: 46 * s, backgroundColor: colors.dot,
      }, enter({ opacity: 0, transform: [{ scale: 0 }] }, { opacity: 1, transform: [{ scale: 1 }] }, 650, 700)]} />
    </View>
  );
}

/** "manendi" set letter by letter; the i — the one who stays — takes the dot's colour. */
export function Wordmark({ size = 44, color, colors = BRAND, animated = false, delay = 0 }: {
  size?: number; color: string; colors?: MarkColors; animated?: boolean; delay?: number;
}) {
  return (
    <View style={{ flexDirection: 'row' }} accessible accessibilityLabel="manendi">
      {[...'manendi'].map((l, i) => (
        <Animated.Text key={i} style={[{ fontFamily: font.display, fontSize: size, lineHeight: size * 1.15, color: i === 6 ? colors.dot : color, letterSpacing: 0.2 }, animated && {
          animationName: { from: { opacity: 0, transform: [{ translateY: size * 0.5 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
          animationDuration: 650, animationDelay: delay + i * 65, animationFillMode: 'both', animationTimingFunction: glide,
        }]}>{l}</Animated.Text>
      ))}
    </View>
  );
}

// ---------- randomized intro backdrops: palette × pattern × tagline ----------
type Pattern = 'aurora' | 'sonar' | 'globe' | 'stamps' | 'dial';
type Palette = { g: [string, string]; blobs: [string, string, string]; mark: MarkColors; text: string; light: boolean };
export type Look = Palette & { bg: string; pattern: Pattern; tagline: string; seed: number[] };

const PALETTES: Palette[] = [
  { g: ['#0F1B2D', '#1C2E4A'], blobs: [brand.gold, brand.mint, brand.stamp], mark: BRAND, text: '#F7F4EC', light: true },
  { g: ['#0C3B2E', '#17805C'], blobs: [brand.mint, brand.gold, '#F7F4EC'], mark: { ring: brand.gold, arch: '#FFFFFF', dot: brand.stamp }, text: '#FFFFFF', light: true },
  { g: ['#0A1E4A', '#27457F'], blobs: [brand.gold, '#7FB7FF', brand.stamp], mark: { ring: brand.gold, arch: '#9FD7FF', dot: brand.stamp }, text: '#F8F3E6', light: true },
  { g: ['#FCE9D6', '#F4C7A1'], blobs: [brand.stamp, brand.gold, brand.green], mark: { ring: '#B8860B', arch: brand.green, dot: brand.stamp }, text: brand.ink, light: false },
  { g: ['#F7F4EC', '#E8DDC4'], blobs: [brand.mint, brand.gold, brand.stamp], mark: { ring: '#B8860B', arch: brand.green, dot: brand.stamp }, text: brand.ink, light: false },
  { g: ['#2B1B3D', '#7A3E5C'], blobs: [brand.gold, brand.stamp, brand.mint], mark: { ring: brand.gold, arch: '#FFFFFF', dot: '#FF9A6B' }, text: '#FFFFFF', light: true },
  { g: ['#05324A', '#0F6E7A'], blobs: [brand.mint, brand.gold, '#FFFFFF'], mark: { ring: brand.gold, arch: brand.mint, dot: '#FF8A5B' }, text: '#FFFFFF', light: true },
  { g: ['#4A1A10', '#A8432A'], blobs: [brand.gold, '#F7F4EC', brand.mint], mark: { ring: '#F2C661', arch: '#F7F4EC', dot: brand.mint }, text: '#F7F4EC', light: true },
];
const PATTERNS: Pattern[] = ['aurora', 'sonar', 'globe', 'stamps', 'dial'];
const TAGLINES = [
  'Stay sure.', 'Every date that keeps you here.', 'Know your days.', 'Your status, in good hands.',
  'Calm for the long wait.', 'No surprise deadlines.', 'Here, and staying.', 'Papers in order. Mind at ease.',
];
const STAMPS = [['ADMITTED', 'JFK'], ['ENTRY', 'SFO'], ['ADMITTED', 'IAH'], ['ENTRY', 'ORD'], ['ADMITTED', 'MIA'], ['ENTRY', 'SEA'], ['ADMITTED', 'ATL']];
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export function pickLook(): Look {
  const p = pick(PALETTES);
  return {
    ...p, bg: `linear-gradient(${110 + Math.round(Math.random() * 130)}deg, ${p.g[0]}, ${p.g[1]})`,
    pattern: pick(PATTERNS), tagline: pick(TAGLINES), seed: Array.from({ length: 16 }, () => Math.random()),
  };
}

const loop = (animationName: CSSAnimationKeyframes, ms: number, delay = 0, alternate = true, ease: 'ease-in-out' | 'linear' | 'ease-out' = 'ease-in-out') => ({
  animationName, animationDuration: ms, animationDelay: delay, animationIterationCount: 'infinite' as const,
  animationDirection: alternate ? ('alternate' as const) : ('normal' as const), animationTimingFunction: ease,
});

export function Backdrop({ look }: { look: Look }) {
  const { width: w, height: h } = useWindowDimensions();
  const r = look.seed;
  const cx = w / 2;
  const cy = h * 0.42;
  const line = tint(look.text, 0.2);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundImage: look.bg, overflow: 'hidden' }]} pointerEvents="none">
      {look.pattern === 'aurora' && look.blobs.map((col, i) => {
        const size = w * (1 + r[i] * 0.7);
        return (
          <Animated.View key={i} style={[
            { position: 'absolute', width: size, height: size, borderRadius: size / 2, left: r[i + 3] * w - size / 2, top: r[i + 6] * h - size / 2,
              backgroundImage: `radial-gradient(circle, ${tint(col, 0.75)} 0%, ${tint(col, 0)} 70%)` },
            loop({ from: { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] },
              to: { transform: [{ translateX: (r[i + 1] - 0.5) * 180 }, { translateY: (r[i + 2] - 0.5) * 260 }, { scale: 1.3 }] } }, 6000 + i * 1800),
          ]} />
        );
      })}

      {look.pattern === 'sonar' && [0, 1, 2, 3].map((i) => (
        <Animated.View key={i} style={[
          { position: 'absolute', width: 220, height: 220, borderRadius: 110, left: cx - 110, top: cy - 110, borderWidth: 1.5, borderColor: tint(look.text, 0.5) },
          loop({ from: { opacity: 0.9, transform: [{ scale: 0.45 }] }, to: { opacity: 0, transform: [{ scale: 4.2 }] } }, 4400, i * 1100, false, 'ease-out'),
        ]} />
      ))}

      {/* A slowly turning globe: meridians are circles squeezed sideways, out of phase. */}
      {look.pattern === 'globe' && (() => {
        const R = Math.min(w, h) * 0.46;
        return (
          <View style={{ position: 'absolute', left: cx - R, top: cy - R, width: R * 2, height: R * 2 }}>
            <View style={{ ...FILL, borderRadius: R, borderWidth: 1.5, borderColor: tint(look.text, 0.28) }} />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Animated.View key={i} style={[{ ...FILL, borderRadius: R, borderWidth: 1, borderColor: line },
                loop({ from: { transform: [{ scaleX: 1 }] }, '50%': { transform: [{ scaleX: 0.02 }] }, to: { transform: [{ scaleX: 1 }] } }, 9000, i * 1500, false, 'linear')]} />
            ))}
            {[0.35, 0.5, 0.65].map((y) => (
              <View key={y} style={{ position: 'absolute', top: R * 2 * y, left: R * 2 * (0.5 - Math.sqrt(0.25 - (y - 0.5) ** 2)), width: R * 4 * Math.sqrt(0.25 - (y - 0.5) ** 2), height: 1, backgroundColor: line }} />
            ))}
          </View>
        );
      })()}

      {look.pattern === 'stamps' && STAMPS.map(([top, port], i) => {
        const size = 96 + r[i] * 56;
        const round = i % 2 === 0;
        return (
          <Animated.View key={i} style={[
            { position: 'absolute', left: r[i + 7] * (w - size), top: ((i + 0.3) / STAMPS.length) * h - size / 2, width: size, height: round ? size : size * 0.66,
              borderRadius: round ? size / 2 : 14, borderWidth: 2.5, borderColor: tint(look.blobs[i % 3], 0.75), alignItems: 'center', justifyContent: 'center' },
            { animationName: { from: { opacity: 0, transform: [{ rotate: `${(r[i] - 0.5) * 50}deg` }, { scale: 1.8 }] },
              '12%': { opacity: 0.85, transform: [{ rotate: `${(r[i] - 0.5) * 50}deg` }, { scale: 1 }] },
              to: { opacity: 0.55, transform: [{ rotate: `${(r[i] - 0.5) * 50 + 6}deg` }, { scale: 1 }, { translateY: -18 }] } },
              animationDuration: 7000, animationDelay: 250 + i * 380, animationFillMode: 'both', animationTimingFunction: 'ease-out' },
          ]}>
            <View style={{ position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderRadius: round ? size / 2 : 10, borderWidth: 1, borderColor: tint(look.blobs[i % 3], 0.6) }} />
            <Text style={{ fontFamily: font.heavy, fontSize: 10, letterSpacing: 2, color: tint(look.blobs[i % 3], 0.95) }}>{top}</Text>
            <Text style={{ fontFamily: font.heavy, fontSize: size * 0.22, letterSpacing: 1, color: tint(look.blobs[i % 3], 0.95) }}>{port}</Text>
          </Animated.View>
        );
      })}

      {/* The status clock as a dial: sixty ticks and a hand that never stops. */}
      {look.pattern === 'dial' && (() => {
        const R = Math.min(w, h) * 0.44;
        return (
          <View style={{ position: 'absolute', left: cx - R, top: cy - R, width: R * 2, height: R * 2 }}>
            {Array.from({ length: 60 }, (_, i) => (
              <View key={i} style={{ position: 'absolute', left: R - 1, top: 0, width: 2, height: R * 2, transform: [{ rotate: `${i * 6}deg` }] }}>
                <View style={{ width: 2, height: i % 5 ? 10 : 22, borderRadius: 1, backgroundColor: tint(look.text, i % 5 ? 0.22 : 0.5) }} />
              </View>
            ))}
            <Animated.View style={[{ position: 'absolute', left: R - 1.5, top: 0, width: 3, height: R * 2 },
              loop({ from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } }, 12000, 0, false, 'linear')]}>
              <View style={{ width: 3, height: R * 0.92, borderRadius: 2, backgroundImage: `linear-gradient(180deg, ${tint(look.blobs[0], 0.9)}, ${tint(look.blobs[0], 0)})` }} />
            </Animated.View>
          </View>
        );
      })()}

      <View style={[StyleSheet.absoluteFill, { backgroundImage: 'radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.26) 100%)' }]} />
    </View>
  );
}

export function Tagline({ look, delay }: { look: Look; delay: number }) {
  return (
    <Animated.View style={{
      animationName: { from: { opacity: 0, transform: [{ translateY: 10 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
      animationDuration: 700, animationDelay: delay, animationFillMode: 'both', animationTimingFunction: glide,
    }}>
      <Text style={{ fontFamily: font.italic, fontSize: 22, color: look.text, opacity: 0.92 }}>{look.tagline}</Text>
    </Animated.View>
  );
}
