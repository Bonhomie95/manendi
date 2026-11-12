import { useColorScheme } from 'react-native';
import type { Level } from './rules';

// Passport night, green-card evergreen, brass, and the red of an entry stamp.
export const brand = { ink: '#0F1B2D', ink2: '#1C2E4A', green: '#17805C', mint: '#3CCB98', gold: '#E2B54A', stamp: '#E4572E', paper: '#F7F4EC' };

const light = {
  bg: '#F7F4EC', card: '#FFFFFF', text: '#0F1B2D', muted: '#5E6878', line: '#E6DFD0', soft: '#EEE8DA',
  accent: '#17805C', alt: '#D9481F', gold: '#A8780A', danger: '#D93A30', good: '#17805C', warn: '#B86E05', onAccent: '#FFFFFF',
};
const dark: typeof light = {
  bg: '#0B1320', card: '#142033', text: '#F3EFE6', muted: '#93A0B2', line: '#22324A', soft: '#1A283D',
  accent: '#3CCB98', alt: '#FF7A50', gold: '#F2C661', danger: '#FF6B61', good: '#3CCB98', warn: '#F2B248', onAccent: '#0B1320',
};
export type Palette = typeof light;
export const useColors = (): Palette => (useColorScheme() === 'dark' ? dark : light);

export const font = {
  display: 'InstrumentSerif_400Regular',
  italic: 'InstrumentSerif_400Regular_Italic',
  body: 'PlusJakartaSans_500Medium',
  semi: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  heavy: 'PlusJakartaSans_800ExtraBold',
};

/** Translucent tint of a hex colour, e.g. tint('#17805C', 0.18). */
export const tint = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

/** What each clock level looks like. */
export const levelColor = (c: Palette, l: Level) =>
  ({ over: c.danger, urgent: c.alt, soon: c.warn, ok: c.accent, info: c.muted })[l];
