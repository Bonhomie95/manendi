import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type ViewStyle,
} from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { font, tint, useColors } from '@/lib/theme';

const ios = Platform.OS === 'ios';

// ---------- type ----------
const variants = {
  hero: { fontFamily: font.display, fontSize: 46, lineHeight: 50, letterSpacing: -0.6 },
  title: { fontFamily: font.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.3 },
  h2: { fontFamily: font.display, fontSize: 25, lineHeight: 29 },
  label: { fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase' as const },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 23 },
  strong: { fontFamily: font.bold, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: font.semi, fontSize: 13, lineHeight: 18 },
};
export function T({ v = 'body', muted, color, style, ...p }: TextProps & { v?: keyof typeof variants; muted?: boolean; color?: string }) {
  const c = useColors();
  return <Text maxFontSizeMultiplier={1.6} {...p} style={[variants[v], { color: color ?? (muted || v === 'label' ? c.muted : c.text) }, style]} />;
}

// ---------- icons: SF Symbols on iOS, Material Symbols on Android ----------
export function Icon({ ios, android, size = 22, color, ...p }: Omit<SymbolViewProps, 'name'> & { ios: SymbolViewProps['name'] & string; android: string; color?: string }) {
  const c = useColors();
  return <SymbolView name={{ ios, android, web: android } as SymbolViewProps['name']} size={size} tintColor={color ?? c.text} {...p} />;
}

// ---------- press feedback ----------
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Tap({ style, onPress, haptic = true, disabled, children, ...p }: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; haptic?: boolean; children?: ReactNode }) {
  const [down, setDown] = useState(false);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      {...p}
      onPressIn={(e) => { setDown(true); p.onPressIn?.(e); }}
      onPressOut={(e) => { setDown(false); p.onPressOut?.(e); }}
      onPress={(e) => { if (haptic) Haptics.selectionAsync(); onPress?.(e); }}
      style={[style, {
        transform: [{ scale: down ? 0.96 : 1 }], opacity: disabled ? 0.45 : (StyleSheet.flatten(style)?.opacity ?? 1),
        transitionProperty: ['transform', 'opacity', 'backgroundColor', 'borderColor'], transitionDuration: 160,
      }]}>
      {children}
    </AnimatedPressable>
  );
}

export function Button({ title, onPress, kind = 'primary', loading, disabled, icon, style }: {
  title: string; onPress?: () => void; kind?: 'primary' | 'accent' | 'ghost' | 'danger' | 'soft';
  loading?: boolean; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = { primary: c.text, accent: c.accent, ghost: 'transparent', danger: tint(c.danger, 0.12), soft: c.soft }[kind];
  const fg = { primary: c.bg, accent: c.onAccent, ghost: c.text, danger: c.danger, soft: c.text }[kind];
  return (
    <Tap onPress={onPress} disabled={disabled || loading} accessibilityLabel={title}
      style={[s.button, { backgroundColor: bg, borderWidth: kind === 'ghost' ? 1.5 : 0, borderColor: c.line }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <>{icon}<Text style={[s.buttonText, { color: fg }]}>{title}</Text></>}
    </Tap>
  );
}

// ---------- surfaces ----------
export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const c = useColors();
  return <View style={[s.card, { backgroundColor: c.card, borderColor: c.line }, style]}>{children}</View>;
}

export function Screen({ children, onRefresh, refreshing, style }: {
  children: ReactNode; onRefresh?: () => void; refreshing?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const scroll = (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      // iOS insets for the status bar and the glass tab bar itself; Android needs them by hand.
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[{ paddingTop: ios ? 8 : insets.top + 14, paddingHorizontal: 20, paddingBottom: ios ? 40 : insets.bottom + 100, gap: 16 }, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.muted} colors={[c.accent]} progressViewOffset={ios ? undefined : insets.top} /> : undefined}>
      {children}
    </ScrollView>
  );
  if (ios) return scroll;
  // Android draws edge to edge: a strip in the page colour keeps scrolled content from running under the status bar.
  return (
    <View style={{ flex: 1 }}>
      {scroll}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: c.bg }} />
    </View>
  );
}

export function Field({ label, style, ...p }: TextInputProps & { label: string }) {
  const c = useColors();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <T v="label">{label}</T>
      <Animated.View style={[s.field, { borderColor: focus ? c.text : c.line, backgroundColor: c.card, transitionProperty: 'borderColor', transitionDuration: 200 }]}>
        <TextInput
          placeholderTextColor={c.muted}
          selectionColor={c.accent}
          accessibilityLabel={label}
          {...p}
          onFocus={(e) => { setFocus(true); p.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); p.onBlur?.(e); }}
          style={[s.input, { color: c.text }, style]}
        />
      </Animated.View>
    </View>
  );
}

export function Chip({ label, on, onPress, color }: { label: string; on?: boolean; onPress?: () => void; color?: string }) {
  const c = useColors();
  const k = color ?? c.text;
  return (
    <Tap onPress={onPress} accessibilityState={{ selected: !!on }} style={[s.chip, { backgroundColor: on ? k : c.soft }]}>
      <Text style={[s.chipText, { color: on ? (k === c.text ? c.bg : '#FFFFFF') : c.text }]}>{label}</Text>
    </Tap>
  );
}

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font.heavy, fontSize: size * 0.42, color: '#FFFFFF' }}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>;
}

// ---------- toast ----------
let pushToast: (text: string) => void = () => {};
export const toast = (text: string) => pushToast(text);

export function ToastHost() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => { pushToast = (text) => setMsg({ id: Date.now(), text }); }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  // iOS presents modals (the paywall, sheets) above the root view; the overlay window keeps the toast on top of them.
  return (
    <FullWindowOverlay>
      <Animated.View key={msg.id} entering={FadeInUp.springify().damping(16)} exiting={FadeOutUp}
        pointerEvents="none" accessibilityLiveRegion="polite"
        style={[s.toast, { top: insets.top + 8, backgroundColor: c.text }]}>
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: c.bg }}>{msg.text}</Text>
      </Animated.View>
    </FullWindowOverlay>
  );
}

const s = StyleSheet.create({
  button: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 22 },
  buttonText: { fontFamily: font.bold, fontSize: 16 },
  card: { borderRadius: 26, padding: 18, borderWidth: StyleSheet.hairlineWidth, gap: 10, boxShadow: '0 8px 28px rgba(15, 27, 45, 0.07)' },
  field: { borderRadius: 18, borderWidth: 1.5 },
  input: { fontFamily: font.semi, fontSize: 17, paddingHorizontal: 16, paddingVertical: 15 },
  chip: { paddingHorizontal: 15, height: 38, borderRadius: 19, justifyContent: 'center' },
  chipText: { fontFamily: font.bold, fontSize: 14 },
  toast: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 13, borderRadius: 22, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' },
});
