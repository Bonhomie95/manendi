import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Simulators reach the Mac at localhost (iOS) / 10.0.2.2 (Android). Set EXPO_PUBLIC_API_URL for devices & prod.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:4100' : 'http://localhost:4100');

/** The API's public pages — the same URLs the store listings use — in an in-app browser. */
export const openPage = (page: 'privacy' | 'terms' | 'support' | 'erase') => WebBrowser.openBrowserAsync(`${API_URL}/${page}`);
export const openLink = (url: string) => WebBrowser.openBrowserAsync(url);

// No accounts: the device proves itself with a random key it makes once and keeps in the keychain.
// It stays on this device (a restored backup on a new phone makes a new key and re-attaches its cases).
const KEY = 'manendi.device';
let deviceKey = SecureStore.getItem(KEY);
if (!deviceKey) {
  deviceKey = Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
  SecureStore.setItemAsync(KEY, deviceKey, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
/** 402 = a Plus feature; callers open the paywall. */
export const needsPlus = (e: unknown) => e instanceof ApiError && e.status === 402;

export async function api<T = { ok: true }>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${deviceKey}` },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError('Can’t reach Manendi right now. Your dates still work offline.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'Something went wrong', res.status);
  return data as T;
}

export type PlanView = { plus: boolean; source: 'store' | 'dev' | null; expiresAt: string | null; testMode?: boolean };
export type Watch = {
  receipt: string; label: string; form: string | null; status: string | null; detail: string; modified: string | null;
  history: { status: string; date: string | null }[]; checkedAt: string | null; error: string | null;
};
export type RadarItem = {
  id: string; title: string; type: string; abstract: string; url: string; date: string; agencies: string[];
  effective: string | null; commentsClose: string | null; tags: string[];
};
