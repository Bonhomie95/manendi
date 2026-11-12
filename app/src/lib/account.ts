// Optional sign-in, only so a household can come back on another phone. Google on both platforms (its native sheet),
// and Sign in with Apple on iPhone, which Apple requires next to Google. Each returns the ID token the API checks, or
// null when the person backs out of the sheet.
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import * as Apple from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type Token = { provider: 'google' | 'apple'; idToken: string; name?: string };
const ids = Constants.expoConfig?.extra?.google as { webClientId: string; iosClientId: string };

export async function googleToken(): Promise<Token | null> {
  GoogleSignin.configure({ webClientId: ids.webClientId, iosClientId: ids.iosClientId });
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut().catch(() => {}); // always show the account picker
    const r = await GoogleSignin.signIn();
    if (!isSuccessResponse(r)) return null;
    if (!r.data.idToken) throw new Error('Google didn’t finish signing you in. Try again.');
    return { provider: 'google', idToken: r.data.idToken };
  } catch (e) {
    // Android code 10: this build's signing key isn't registered with Google yet.
    if (String((e as { code?: unknown }).code) === '10') throw new Error('Google sign-in isn’t set up for this build yet.');
    throw e;
  }
}

export async function appleToken(): Promise<Token | null> {
  try {
    const r = await Apple.signInAsync({ requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL] });
    if (!r.identityToken) throw new Error('Apple didn’t finish signing you in. Try again.');
    // Apple shares the name only on the very first sign-in, so pass it along for the account.
    const name = [r.fullName?.givenName, r.fullName?.familyName].filter(Boolean).join(' ');
    return { provider: 'apple', idToken: r.identityToken, ...(name ? { name } : {}) };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}
