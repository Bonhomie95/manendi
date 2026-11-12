import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Backdrop, Mark, Tagline, Wordmark, pickLook } from '@/components/brand';
import { useStore } from '@/lib/store';

// Every launch draws a fresh look: 8 palettes × 5 patterns × random angles × 8 taglines.
export default function Intro() {
  const { data } = useStore();
  const [look] = useState(pickLook);
  const [shown, setShown] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  // Start the clock only once the splash is gone, so slow launches still see the whole show.
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setTimeUp(true), 2700);
    return () => clearTimeout(t);
  }, [shown]);
  useEffect(() => { if (timeUp) router.replace(data.people.length ? '/(tabs)' : '/welcome'); }, [timeUp, data.people.length]);

  return (
    <Pressable style={{ flex: 1 }} onPress={() => setTimeUp(true)} accessibilityHint="Tap to skip the intro"
      onLayout={() => { if (!shown) { SplashScreen.hide(); setShown(true); } }}>
      <StatusBar style={look.light ? 'light' : 'dark'} />
      <Backdrop look={look} />
      {shown && <View style={s.center}>
        <Mark size={170} colors={look.mark} animated delay={150} />
        <View style={{ height: 30 }} />
        <Wordmark size={60} color={look.text} colors={look.mark} animated delay={900} />
        <Tagline look={look} delay={1500} />
      </View>}
    </Pressable>
  );
}

const s = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, gap: 6 } });
