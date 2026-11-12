// app.json holds the config; this only refuses store builds that would ship pointed at localhost or in
// no-charge test mode. MANENDI_STORE_BUILD comes from eas.json's production profile, so it fails before upload.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.MANENDI_STORE_BUILD) {
    const env = process.env;
    const missing = [
      !env.EXPO_PUBLIC_API_URL?.startsWith('https://') && 'EXPO_PUBLIC_API_URL (https://…)',
      !env.EXPO_PUBLIC_RC_IOS_KEY?.startsWith('appl_') && 'EXPO_PUBLIC_RC_IOS_KEY (appl_…)',
      !env.EXPO_PUBLIC_RC_ANDROID_KEY?.startsWith('goog_') && 'EXPO_PUBLIC_RC_ANDROID_KEY (goog_…)',
    ].filter(Boolean);
    if (missing.length) throw new Error(`Store builds need ${missing.join(', ')}. See STORE.md → "Ship it".`);
  }
  return config as ExpoConfig;
};
