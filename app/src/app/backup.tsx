// Offered once, at the end of setup: the household is in and the clock is on screen, so backing it up is one tap.
// Skipping is fine; the same sign-in lives in Family.
import { router } from 'expo-router';
import { View } from 'react-native';
import { Mark } from '@/components/brand';
import { Sheet } from '@/components/sheet';
import { SignIn } from '@/components/sign-in';
import { T, Tap } from '@/components/ui';

export default function Backup() {
  return (
    <Sheet title="Back up your household?" footer={
      <View style={{ gap: 14 }}>
        <SignIn onDone={() => router.back()} />
        <Tap onPress={() => router.back()} accessibilityLabel="Not now" style={{ alignSelf: 'center', paddingVertical: 4 }}>
          <T v="strong" muted>Not now</T>
        </Tap>
      </View>
    }>
      <Mark size={64} />
      <T v="body" muted style={{ fontSize: 18, lineHeight: 26 }}>
        Sign in and everyone’s dates, trips and cases come back on a new phone.
      </T>
      <T v="small" muted>Optional. Document photos never leave this phone. You’ll also find this in Family.</T>
    </Sheet>
  );
}
