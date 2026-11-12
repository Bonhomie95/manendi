// The optional sign-in buttons. Apple's own button on iPhone (its guidelines ask for it) and a Google button drawn to
// Google's branding rules (the four-colour G, "Continue with Google", light or dark surface).
import * as Apple from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Tap, toast } from '@/components/ui';
import { appleToken, googleToken } from '@/lib/account';
import { full } from '@/lib/dates';
import { useStore, type Backup } from '@/lib/store';
import { font } from '@/lib/theme';

/** A phone that already has people asks before an account backup replaces them. */
const choose = (b: Backup) => new Promise<boolean>((resolve) => {
  const n = b.people.length;
  Alert.alert('Use your backup?',
    `Your account has a backup from ${full(b.at.slice(0, 10))} with ${n} ${n === 1 ? 'person' : 'people'}. Use it on this phone, or keep what’s here and back that up instead?`,
    [{ text: 'Keep this phone’s', onPress: () => resolve(false) }, { text: 'Use backup', onPress: () => resolve(true) }],
    { cancelable: false });
});

export function SignIn({ onDone }: { onDone?: (restored: boolean) => void }) {
  const dark = useColorScheme() === 'dark';
  const { signIn } = useStore();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [apple, setApple] = useState(false);
  useEffect(() => { if (Platform.OS === 'ios') Apple.isAvailableAsync().then(setApple).catch(() => {}); }, []);

  async function go(provider: 'google' | 'apple') {
    if (busy) return;
    setBusy(provider);
    try {
      const t = await (provider === 'google' ? googleToken() : appleToken());
      if (!t) return; // backed out of the sheet
      const restored = await signIn(t, choose);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(restored ? 'Welcome back. Your household is restored.' : 'Signed in. Your household is backed up.');
      onDone?.(restored);
    } catch (e) {
      toast((e as Error).message || 'Sign-in didn’t work. Try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      {apple && (
        <Apple.AppleAuthenticationButton
          buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={dark ? Apple.AppleAuthenticationButtonStyle.WHITE : Apple.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={18} style={{ height: 54 }} onPress={() => go('apple')} />
      )}
      <Tap onPress={() => go('google')} accessibilityLabel="Continue with Google"
        style={[s.google, dark ? { backgroundColor: '#131314', borderColor: '#8E918F' } : { backgroundColor: '#FFFFFF', borderColor: '#747775' }]}>
        {busy === 'google' ? <ActivityIndicator color={dark ? '#E3E3E3' : '#1F1F1F'} /> : (
          <>
            <Image source={require('@/assets/images/google-g.svg')} style={{ width: 20, height: 20 }} />
            <Text style={[s.googleText, { color: dark ? '#E3E3E3' : '#1F1F1F' }]}>Continue with Google</Text>
          </>
        )}
      </Tap>
    </View>
  );
}

const s = StyleSheet.create({
  google: { height: 54, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleText: { fontFamily: font.bold, fontSize: 17 },
});
