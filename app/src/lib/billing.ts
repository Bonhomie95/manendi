// Manendi Plus purchases. StoreKit / Play Billing via RevenueCat when keys are set;
// otherwise a no-charge test mode backed by the API (simulators, local dev).
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import { api, type PlanView } from './api';

const KEY = Platform.select({ ios: process.env.EXPO_PUBLIC_RC_IOS_KEY, android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY });
export const testMode = !KEY;

export type Period = 'annual' | 'monthly';
export type Offer = { period: Period; price: string; amount: number | null; perMonth: string | null; pkg?: PurchasesPackage };

// Shown in test mode and as a fallback if the store can't be reached. Keep in sync with the store products.
const FALLBACK: Offer[] = [
  { period: 'annual', price: '$79.99', amount: 79.99, perMonth: '$6.67' },
  { period: 'monthly', price: '$9.99', amount: 9.99, perMonth: null },
];

let configured = false;
export async function startBilling(appUserId: string) {
  if (!KEY || configured) return;
  Purchases.configure({ apiKey: KEY, appUserID: appUserId });
  configured = true;
}

/** A phone joining an existing account takes the account's purchase ID, so the account's Plus applies here too. */
export async function switchUser(appUserId: string) {
  if (KEY && configured) await Purchases.logIn(appUserId).catch(() => {});
}

export async function getOffers(): Promise<Offer[]> {
  if (!KEY) return FALLBACK;
  try {
    const current = (await Purchases.getOfferings()).current;
    const offers = ([['annual', current?.annual], ['monthly', current?.monthly]] as const)
      .filter(([, pkg]) => pkg)
      .map(([period, pkg]) => ({
        period, pkg: pkg!, price: pkg!.product.priceString, amount: pkg!.product.price,
        perMonth: period === 'annual' ? pkg!.product.pricePerMonthString ?? null : null,
      }));
    return offers.length ? offers : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Returns the new plan, or null if the person cancelled the store sheet. */
export async function buy(offer: Offer): Promise<PlanView | null> {
  if (!KEY) return api<PlanView>('/billing/dev-grant', { body: { period: offer.period } });
  // Fallback offers (store unreachable) carry no package: try the store once more, then say so out loud.
  const pkg = offer.pkg ?? (await getOffers()).find((o) => o.period === offer.period)?.pkg;
  if (!pkg) throw new Error(`Couldn’t reach ${Platform.OS === 'ios' ? 'the App Store' : 'Google Play'}. Try again in a moment.`);
  try {
    await Purchases.purchasePackage(pkg);
  } catch (e) {
    if ((e as { code?: string }).code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return null;
    throw e;
  }
  return api<PlanView>('/billing/sync', { method: 'POST' });
}

export async function restore(): Promise<PlanView> {
  if (KEY) await Purchases.restorePurchases();
  return api<PlanView>('/billing/sync', { method: 'POST' });
}

export const manageUrl = Platform.OS === 'ios'
  ? 'https://apps.apple.com/account/subscriptions'
  : 'https://play.google.com/store/account/subscriptions';
