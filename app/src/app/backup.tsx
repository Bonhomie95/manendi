// Offered once, at the end of setup: the household is in and the clock is on screen, so backing it up is one tap.
// Skipping is fine; the same sign-in lives in Family.
import { router } from 'expo-router';
import { View } from 'react-native';
import { Mark } from '@/components/brand';
import { Sheet } from '@/components/sheet';
import { SignIn } from '@/components/sign-in';
import { T, Tap } from '@/components/ui';
import { t } from '@/lib/i18n';

export default function Backup() {
  return (
    <Sheet title={t('backup.title')} footer={
      <View style={{ gap: 14 }}>
        <SignIn onDone={() => router.back()} />
        <Tap onPress={() => router.back()} accessibilityLabel={t('backup.notNow')} style={{ alignSelf: 'center', paddingVertical: 4 }}>
          <T v="strong" muted>{t('backup.notNow')}</T>
        </Tap>
      </View>
    }>
      <Mark size={64} />
      <T v="body" muted style={{ fontSize: 18, lineHeight: 26 }}>{t('backup.body')}</T>
      <T v="small" muted>{t('backup.note')}</T>
    </Sheet>
  );
}
