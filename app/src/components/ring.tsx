import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

/** The status clock: sixty segments, lit for the share of the window still left. Fills in on mount. */
export function Ring({ size, progress, color, track, children, segments = 60 }: {
  size: number; progress: number; color: string; track: string; children?: ReactNode; segments?: number;
}) {
  const lit = Math.round(Math.max(0, Math.min(1, progress)) * segments);
  const len = size * 0.085;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      {Array.from({ length: segments }, (_, i) => (
        <View key={i} style={{ position: 'absolute', left: size / 2 - 2, top: 0, width: 4, height: size, transform: [{ rotate: `${(i * 360) / segments}deg` }] }}>
          <Animated.View style={[{ width: 4, height: len, borderRadius: 2, backgroundColor: i < lit ? color : track },
            i < lit && { animationName: { from: { opacity: 0, transform: [{ scaleY: 0.2 }] }, to: { opacity: 1, transform: [{ scaleY: 1 }] } },
              animationDuration: 380, animationDelay: 120 + i * 14, animationFillMode: 'both', animationTimingFunction: 'ease-out' }]} />
        </View>
      ))}
      {children}
    </View>
  );
}
