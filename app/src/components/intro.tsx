import { File, Paths } from 'expo-file-system';
import { Text, View } from 'react-native';
import Animated, { cubicBezier, steps, type CSSAnimationKeyframes, type CSSAnimationTimingFunction } from 'react-native-reanimated';
import type { MarkColors } from '@/components/brand';
import { font, tint } from '@/lib/theme';

// The launch logo, reborn every time: the same mark (ring, doorway, dot) assembled by one of thirteen choreographies,
// its name set in one of seven letter styles, sometimes inside a turning motto seal.

const pop = cubicBezier(0.34, 1.56, 0.64, 1);
const glide = cubicBezier(0.2, 0.8, 0.2, 1);
const snap = cubicBezier(0.16, 1, 0.3, 1);
const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

// ---------- keyframes in the mark's own 784-unit box ----------
type F = { o?: number; x?: number; y?: number; r?: number; s?: number; sx?: number; sy?: number };
type Move = { k: Record<string, F>; ms: number; at?: number; ease?: CSSAnimationTimingFunction };
// Every frame lists the same transforms in the same order, so any two frames interpolate cleanly. All 2D: on iOS a 3D
// turn lets the half that swings behind the screen vanish under the backdrop, so flips scale through zero instead.
const frame = (u: number, { o = 1, x = 0, y = 0, r = 0, s = 1, sx = s, sy = s }: F) => ({
  opacity: o,
  transform: [{ translateX: x * u }, { translateY: y * u }, { rotate: `${r}deg` }, { scaleX: sx }, { scaleY: sy }],
});
const play = (u: number, delay: number, m?: Move) => m ? {
  animationName: Object.fromEntries(Object.entries({ to: {}, ...m.k }).map(([key, f]) => [key, frame(u, f)])) as CSSAnimationKeyframes,
  animationDuration: m.ms, animationDelay: delay + (m.at ?? 0), animationFillMode: 'both' as const, animationTimingFunction: m.ease ?? glide,
} : null;

type Choreo = { whole?: Move; ring?: Move; arch?: Move; dot?: Move; quarters?: [Move, Move, Move]; extra?: 'shock' | 'ripples' | 'orbit'; land: number };
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

const CHOREO = {
  // The seal turns into place, the doorway rises, you arrive.
  seal: () => ({ ring: { k: { from: { o: 0, r: -120, s: 0.82 } }, ms: 1100, ease: pop }, arch: { k: { from: { o: 0, y: 90 } }, ms: 800, at: 260 },
    dot: { k: { from: { o: 0, s: 0 } }, ms: 650, at: 700, ease: pop }, land: 1200 }),
  // A passport stamp: slammed down, a shock ring on impact.
  stamp: () => ({ whole: { k: { from: { o: 0, s: 2.8, r: -16 }, '55%': { o: 1, s: 0.93, r: 2 }, '72%': { s: 1.04, r: -1 }, '86%': { s: 0.99, r: 0 } }, ms: 780, ease: 'ease-in' },
    extra: 'shock', land: 800 }),
  // The dot laps the seal twice, then steps through the door.
  orbit: () => ({ ring: { k: { from: { o: 0, s: 0.6 } }, ms: 650 }, arch: { k: { from: { o: 0, sy: 0.1 } }, ms: 650, at: 250 },
    dot: { k: { from: { o: 0, s: 0 } }, ms: 520, at: 1380, ease: pop }, extra: 'orbit', land: 1750 }),
  // The doorway opens first; you walk in with a little hop.
  door: () => ({ arch: { k: { from: { o: 0, sy: 0.05 } }, ms: 700 }, ring: { k: { from: { o: 0, r: -200, s: 1.15 } }, ms: 950, at: 150 },
    dot: { k: { from: { o: 0, x: 320 }, '45%': { o: 1, x: 130, y: -70 }, '78%': { x: -12, y: 0 } }, ms: 800, at: 650, ease: 'ease-out' }, land: 1450 }),
  // Three quarters of the seal fly in from different sides and lock together.
  assemble: () => ({ quarters: [
    { k: { from: { o: 0, x: 520, y: -260, r: 120 } }, ms: 850, ease: pop },
    { k: { from: { o: 0, x: -80, y: 560, r: -90 } }, ms: 850, at: 120, ease: pop },
    { k: { from: { o: 0, x: -560, y: -180, r: 80 } }, ms: 850, at: 240, ease: pop },
  ], arch: { k: { from: { o: 0, y: -320 }, '70%': { o: 1, y: 18 } }, ms: 700, at: 520 }, dot: { k: { from: { o: 0, s: 0 } }, ms: 520, at: 1000, ease: pop }, land: 1450 }),
  // Springs out of nothing; rings ripple off it like a stone in water.
  ripple: () => ({ whole: { k: { from: { o: 0, s: 0.2 }, '60%': { o: 1, s: 1.12 }, '80%': { s: 0.96 } }, ms: 900 }, extra: 'ripples', land: 950 }),
  // A coin flipping until it faces you (scaling through zero shows its mirrored back).
  coin: () => ({ whole: { k: { from: { o: 0, sx: 0.04 }, '28%': { o: 1, sx: -1 }, '52%': { sx: 0.04 }, '78%': { sx: 1.06 } }, ms: 1400, ease: 'ease-in-out' }, land: 1400 }),
  // The seal ticks round like a clock hand; the doorway drops in on the hour.
  tick: () => ({ ring: { k: { from: { o: 0, r: -330 } }, ms: 1000, ease: steps(11) }, arch: { k: { from: { o: 0, y: -240 }, '60%': { o: 1, y: 22 }, '80%': { y: -8 } }, ms: 750, at: 850 },
    dot: { k: { from: { o: 0, s: 0 } }, ms: 500, at: 1350, ease: pop }, land: 1700 }),
  // Drifts down out of focus and settles, calm.
  focus: () => ({ whole: { k: { from: { o: 0, s: 1.7, r: 10 } }, ms: 1300, ease: snap }, land: 1100 }),
  // Each piece falls in and bounces, squashing on landing.
  drop: () => ({ ring: { k: { from: { o: 0, y: -950 }, '42%': { o: 1, y: 0, sx: 1, sy: 1 }, '52%': { y: 0, sx: 1.12, sy: 0.86 }, '68%': { y: -130, sx: 0.97, sy: 1.03 }, '84%': { y: 0, sx: 1.04, sy: 0.97 } }, ms: 1250, ease: 'ease-in-out' },
    arch: { k: { from: { o: 0, y: -700 }, '55%': { o: 1, y: 0 }, '75%': { y: -50 } }, ms: 900, at: 450, ease: 'ease-in-out' },
    dot: { k: { from: { o: 0, y: -600 }, '60%': { o: 1, y: 0 }, '80%': { y: -40 } }, ms: 700, at: 850, ease: 'ease-in-out' }, land: 1550 }),
  // Spun up from a pinpoint; the dot swoops in last.
  vortex: () => ({ whole: { k: { from: { o: 0, r: -600, s: 0.1 } }, ms: 1300 }, dot: { k: { from: { o: 0, x: -340, y: -340, s: 0.3 } }, ms: 750, at: 850, ease: pop }, land: 1600 }),
  // Two beats, like a pulse.
  heartbeat: () => ({ whole: { k: { from: { o: 0, s: 0.6 }, '22%': { o: 1, s: 1 }, '36%': { s: 1.15 }, '46%': { s: 1 }, '58%': { s: 1.09 }, '70%': { s: 1 } }, ms: 1700, ease: 'ease-in-out' }, land: 1000 }),
  // The pieces start somewhere new every time and find each other.
  scatter: (r: number[]) => ({
    ring: { k: { from: { o: 0, x: (r[0] - 0.5) * 1100, y: (r[1] - 0.5) * 1600, r: (r[2] - 0.5) * 400, s: 0.5 } }, ms: 1000 },
    arch: { k: { from: { o: 0, x: (r[3] - 0.5) * 1100, y: (r[4] - 0.5) * 1600, r: (r[5] - 0.5) * 400, s: 0.4 } }, ms: 1000, at: 120 },
    dot: { k: { from: { o: 0, x: (r[6] - 0.5) * 1100, y: (r[7] - 0.5) * 1600, s: 0.2 } }, ms: 900, at: 240, ease: pop }, land: 1250 }),
} satisfies Record<string, (r: number[]) => Choreo>;
export type Entrance = keyof typeof CHOREO;
const ENTRANCES = Object.keys(CHOREO) as Entrance[];

// ---------- the name ----------
type LF = { o?: number; x?: number; y?: number; sy?: number; s?: number };
const letter = ({ o = 1, x = 0, y = 0, sy = 1, s = 1 }: LF) => ({ opacity: o, transform: [{ translateX: x }, { translateY: y }, { scaleY: sy }, { scale: s }] });
const LETTERS = {
  rise: (i: number, z: number) => ({ k: { from: { o: 0, y: z * 0.5 } }, ms: 650, at: i * 65, ease: glide }),
  drop: (i: number, z: number) => ({ k: { from: { o: 0, y: -z * 0.9 }, '70%': { o: 1, y: z * 0.08 } }, ms: 720, at: i * 60, ease: glide }),
  wave: (i: number, z: number) => ({ k: { from: { o: 0, y: z * 0.6 }, '55%': { o: 1, y: -z * 0.2 } }, ms: 820, at: i * 80, ease: 'ease-in-out' }),
  flap: (i: number) => ({ k: { from: { o: 0, sy: 0 }, '60%': { o: 1, sy: 1.2 } }, ms: 620, at: i * 70, ease: 'ease-out' }), // a departures board
  pop: (i: number) => ({ k: { from: { o: 0, s: 0.2 } }, ms: 520, at: i * 55, ease: pop }),
  converge: (i: number, z: number) => ({ k: { from: { o: 0, x: (i - 3) * z * 0.55 } }, ms: 850, at: 0, ease: snap }),
  type: (i: number) => ({ k: { from: { o: 0 } }, ms: 1, at: i * 95, ease: 'linear' }),
} satisfies Record<string, (i: number, z: number) => { k: Record<string, LF>; ms: number; at: number; ease: CSSAnimationTimingFunction }>;
type Letters = keyof typeof LETTERS;

const MOTTOS = ['HERE AND STAYING', 'EVERY DATE THAT KEEPS YOU HERE', 'KNOW YOUR DAYS', 'STAY SURE', 'PAPERS IN ORDER'];

export type Intro = { entrance: Entrance; letters: Letters; motto: string | null; seed: number[] };

// A shuffled deck on disk: every choreography plays once before any repeats.
const DECK = new File(Paths.document, 'intro-deck.json');
function nextEntrance(): Entrance {
  let deck: Entrance[] = [];
  try { if (DECK.exists) deck = (JSON.parse(DECK.textSync()) as Entrance[]).filter((e) => e in CHOREO); } catch { /* start a new deck */ }
  if (!deck.length) deck = [...ENTRANCES].sort(() => Math.random() - 0.5);
  const [next, ...rest] = deck;
  try { if (!DECK.exists) DECK.create(); DECK.writeSync(JSON.stringify(rest)); } catch { /* a repeat now and then is fine */ }
  return next;
}

export function pickIntro(): Intro {
  return { entrance: nextEntrance(), letters: pick(Object.keys(LETTERS) as Letters[]), motto: Math.random() < 0.3 ? pick(MOTTOS) : null, seed: Array.from({ length: 8 }, Math.random) };
}

/** When the mark has settled, in ms after it starts: the name and tagline follow from here. */
export const landsAt = (intro: Intro) => (CHOREO[intro.entrance] as (r: number[]) => Choreo)(intro.seed).land;

export function IntroMark({ intro, size, colors, text, delay }: { intro: Intro; size: number; colors: MarkColors; text: string; delay: number }) {
  const u = size / 784;
  const ch = (CHOREO[intro.entrance] as (r: number[]) => Choreo)(intro.seed);
  const circle = { position: 'absolute', width: size, height: size, borderRadius: size / 2 } as const;
  const sides = [{ borderRightColor: colors.ring }, { borderBottomColor: colors.ring }, { borderLeftColor: colors.ring }];
  return (
    <Animated.View style={[{ width: size, height: size }, play(u, delay, ch.whole)]} accessible accessibilityRole="image" accessibilityLabel="Manendi">
      <Animated.View style={{
        position: 'absolute', left: -size * 0.2, top: -size * 0.2, width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7,
        backgroundImage: `radial-gradient(circle, ${tint(colors.ring, 0.55)} 0%, ${tint(colors.ring, 0)} 66%)`,
        animationName: { from: { opacity: 0, transform: [{ scale: 0.4 }] }, '45%': { opacity: 1 }, to: { opacity: 0, transform: [{ scale: 1.6 }] } },
        animationDuration: 1800, animationDelay: delay + ch.land * 0.45, animationFillMode: 'both', animationTimingFunction: glide,
      }} />
      {intro.motto && <Motto words={intro.motto} size={size} color={tint(text, 0.72)} delay={delay + ch.land} />}
      {ch.extra === 'ripples' && [0, 1, 2].map((k) => (
        <Animated.View key={k} style={[circle, { borderWidth: 3, borderColor: tint(colors.ring, 0.8) },
          play(u, delay, { k: { from: { o: 0.7, s: 1 }, to: { o: 0, s: 2.3 } }, ms: 1500, at: 350 + k * 260, ease: 'ease-out' })]} />
      ))}
      {ch.extra === 'shock' && (
        <Animated.View style={[circle, { borderWidth: 4, borderColor: tint(colors.dot, 0.85) },
          play(u, delay, { k: { from: { o: 0, s: 0.95 }, '1%': { o: 0.9, s: 0.95 }, to: { o: 0, s: 1.9 } }, ms: 700, at: 430, ease: 'ease-out' })]} />
      )}
      {/* Per-side border colours on a circle draw quarter arcs; the clear top quarter, turned 45°, is the gap. */}
      {ch.quarters ? (
        <View style={[circle, { transform: [{ rotate: '45deg' }] }]}>
          {ch.quarters.map((m, i) => (
            <Animated.View key={i} style={[circle, { borderWidth: 64 * u, borderColor: 'transparent' }, sides[i], play(u, delay, m)]} />
          ))}
        </View>
      ) : (
        <Animated.View style={[circle, play(u, delay, ch.ring)]}>
          <View style={[circle, { borderWidth: 64 * u, borderColor: colors.ring, borderTopColor: 'transparent', transform: [{ rotate: '45deg' }] }]} />
        </Animated.View>
      )}
      <Animated.View style={[{
        position: 'absolute', left: 242 * u, top: 232 * u, width: 300 * u, height: 360 * u, borderWidth: 64 * u, borderBottomWidth: 0,
        borderColor: colors.arch, borderTopLeftRadius: 150 * u, borderTopRightRadius: 150 * u, transformOrigin: 'bottom',
      }, play(u, delay, ch.arch)]} />
      {ch.extra === 'orbit' && (
        <Animated.View style={[circle, play(u, delay, { k: { from: { o: 0, r: 0 }, '12%': { o: 1, r: 86 }, '88%': { o: 1, r: 634 }, to: { o: 0, r: 720 } }, ms: 1300, at: 200, ease: 'linear' })]}>
          <View style={{ position: 'absolute', left: 346 * u, top: -14 * u, width: 92 * u, height: 92 * u, borderRadius: 46 * u, backgroundColor: colors.dot }} />
        </Animated.View>
      )}
      <Animated.View style={[{ position: 'absolute', left: 346 * u, top: 474 * u, width: 92 * u, height: 92 * u, borderRadius: 46 * u, backgroundColor: colors.dot }, play(u, delay, ch.dot)]} />
    </Animated.View>
  );
}

/** A seal of words around the mark, turning slowly once it's in. */
function Motto({ words, size, color, delay }: { words: string; size: number; color: string; delay: number }) {
  const R = size * 0.74;
  const unit = `${words} · `;
  const text = unit.repeat(Math.max(1, Math.round((2 * Math.PI * R) / 10.5 / unit.length)));
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: size / 2 - R, top: size / 2 - R, width: R * 2, height: R * 2,
      animationName: { from: { opacity: 0, transform: [{ scale: 0.86 }, { rotate: '-30deg' }] }, to: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }] } },
      animationDuration: 900, animationDelay: delay, animationFillMode: 'both', animationTimingFunction: glide,
    }}>
      <Animated.View style={{ ...FILL, animationName: { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } }, animationDuration: 40000, animationIterationCount: 'infinite', animationTimingFunction: 'linear' }}>
        {[...text].map((c, i) => (
          <View key={i} style={{ position: 'absolute', left: R - 6, top: 0, width: 12, height: R * 2, alignItems: 'center', transform: [{ rotate: `${(i * 360) / text.length}deg` }] }}>
            <Text style={{ fontFamily: font.heavy, fontSize: 11, color }}>{c}</Text>
          </View>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

/** "manendi", set in this launch's letter style; the i takes the dot's colour. */
export function IntroWordmark({ intro, size, color, colors, delay }: { intro: Intro; size: number; color: string; colors: MarkColors; delay: number }) {
  return (
    <View style={{ flexDirection: 'row' }} accessible accessibilityLabel="manendi">
      {[...'manendi'].map((l, i) => {
        const m = LETTERS[intro.letters](i, size);
        return (
          <Animated.Text key={i} style={[{ fontFamily: font.display, fontSize: size, lineHeight: size * 1.15, color: i === 6 ? colors.dot : color, letterSpacing: 0.2 }, {
            animationName: Object.fromEntries(Object.entries({ to: {}, ...m.k }).map(([key, f]) => [key, letter(f)])) as CSSAnimationKeyframes,
            animationDuration: m.ms, animationDelay: delay + m.at, animationFillMode: 'both', animationTimingFunction: m.ease,
          }]}>{l}</Animated.Text>
        );
      })}
    </View>
  );
}
