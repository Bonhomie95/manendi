import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Backdrop, Tagline, pickLook } from '@/components/brand';
import { IntroMark, IntroWordmark, landsAt, pickIntro } from '@/components/intro';
import { useStore } from '@/lib/store';

// Every launch draws a fresh look: 13 logo choreographies (dealt from a shuffled deck, so none repeats until all have
// played) × 7 letter styles × an occasional motto seal × 8 palettes × 5 backdrops × 8 taglines.
export default function Intro() {
  const { data } = useStore();
  const [look] = useState(pickLook);
  const [intro] = useState(pickIntro);
  const nameAt = 150 + landsAt(intro) - 200;
  const tagAt = nameAt + 650;
  const [shown, setShown] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  // Start the clock only once the splash is gone, so slow launches still see the whole show.
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setTimeUp(true), tagAt + 1100);
    return () => clearTimeout(t);
  }, [shown, tagAt]);
  useEffect(() => { if (timeUp) router.replace(data.people.length ? '/(tabs)' : '/welcome'); }, [timeUp, data.people.length]);

  return (
    <Pressable style={{ flex: 1 }} onPress={() => setTimeUp(true)} accessibilityHint="Tap to skip the intro"
      onLayout={() => { if (!shown) { SplashScreen.hide(); setShown(true); } }}>
      <StatusBar style={look.light ? 'light' : 'dark'} />
      <Backdrop look={look} />
      {shown && <View style={s.center}>
        <IntroMark intro={intro} size={170} colors={look.mark} text={look.text} delay={150} />
        <View style={{ height: intro.motto ? 78 : 30 }} />
        <IntroWordmark intro={intro} size={60} color={look.text} colors={look.mark} delay={nameAt} />
        <Tagline look={look} delay={tagAt} />
      </View>}
    </Pressable>
  );
}

const s = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, gap: 6 } });
