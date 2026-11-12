// A new phone: sign in with the account the household was backed up to and it all comes back. An account with no
// backup yet goes on to the usual setup, and backs up from then on.
import { router } from 'expo-router';
import { Mark } from '@/components/brand';
import { Sheet } from '@/components/sheet';
import { SignIn } from '@/components/sign-in';
import { T } from '@/components/ui';

export default function Restore() {
  return (
    <Sheet title="Welcome back" footer={
      <SignIn onDone={(restored) => { router.dismissAll(); router.replace(restored ? '/(tabs)' : '/setup'); }} />
    }>
      <Mark size={64} />
      <T v="body" muted style={{ fontSize: 18, lineHeight: 26 }}>
        Sign in with the account you backed up to. Everyone’s dates, trips and cases come back to this phone.
      </T>
      <T v="small" muted>Document photos stay on the phone they were taken on. No backup on that account yet? You’ll set up as usual.</T>
    </Sheet>
  );
}
