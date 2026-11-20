// A new phone: sign in with the account the household was backed up to and it all comes back. An account with no
// backup yet goes on to the usual setup, and backs up from then on.
import { router } from 'expo-router';
import { Mark } from '@/components/brand';
import { Sheet } from '@/components/sheet';
import { SignIn } from '@/components/sign-in';
import { T } from '@/components/ui';
import { t } from '@/lib/i18n';

export default function Restore() {
  return (
    <Sheet title={t('restore.title')} footer={
      <SignIn onDone={(restored) => { router.dismissAll(); router.replace(restored ? '/(tabs)' : '/setup'); }} />
    }>
      <Mark size={64} />
      <T v="body" muted style={{ fontSize: 18, lineHeight: 26 }}>{t('restore.body')}</T>
      <T v="small" muted>{t('restore.note')}</T>
    </Sheet>
  );
}
