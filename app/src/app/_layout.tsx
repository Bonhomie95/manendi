import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts } from '@expo-google-fonts/plus-jakarta-sans';
import * as Notifications from 'expo-notifications';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastHost } from '@/components/ui';
import { StoreProvider } from '@/lib/store';
import { useColors } from '@/lib/theme';

// Known-benign RN dev warning from native-driven scroll events; not ours to fix.
LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered']);

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 250, fade: true });

const modal = { presentation: 'modal', animation: 'slide_from_bottom' } as const;

export default function RootLayout() {
  const c = useColors();
  const intro = !useSegments()[0]; // only the intro has no segments
  const [loaded] = useFonts({
    InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic,
    PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });
  // The intro hides the splash itself once its first frame is laid out; any other entry point hides it here.
  useEffect(() => { if (loaded && !intro) SplashScreen.hide(); }, [loaded, intro]);
  // A tapped case alert opens Cases.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      if (r.notification.request.content.data?.path === '/cases') router.navigate('/(tabs)/cases');
    });
    return () => sub.remove();
  }, []);
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <StoreProvider>
        {!intro && <StatusBar style="auto" />}
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'fade' }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="setup" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="person" options={modal} />
          <Stack.Screen name="clock" options={modal} />
          <Stack.Screen name="case" options={modal} />
          <Stack.Screen name="trip" options={modal} />
          <Stack.Screen name="job" options={modal} />
          <Stack.Screen name="fly" options={modal} />
          <Stack.Screen name="doc" options={modal} />
          <Stack.Screen name="vault" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="plan" options={modal} />
          <Stack.Screen name="restore" options={modal} />
        </Stack>
        <ToastHost />
      </StoreProvider>
    </GestureHandlerRootView>
  );
}
