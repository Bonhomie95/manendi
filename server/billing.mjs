// Manendi Plus. The stores bill, RevenueCat verifies, and the plan is cached on the device record.
// RevenueCat's app user ID is a random ID the app generates on first launch; a signed-in account shares one ID across phones.
export const ENTITLEMENT = 'plus';
export const LIMITS = { free: { watches: 1 }, plus: { watches: 25 } };

/** plan: { source: 'store' | 'dev' | 'code', expiresAt: Date } */
export const isPlus = (device, now = Date.now()) => !!device?.plan && +new Date(device.plan.expiresAt) > now;

export const planView = (device, now = Date.now()) => ({
  plus: isPlus(device, now), source: device?.plan?.source ?? null, expiresAt: device?.plan?.expiresAt ?? null,
});

/** Stores renew without telling us: a store plan past its stored expiry may just have renewed — ask again. */
export const lapsed = (device, now = Date.now()) => device?.plan?.source === 'store' && !isPlus(device, now);

/** RevenueCat subscriber payload → the plan to store, or null. Lifetime entitlements have no expiry. */
export function storePlan(subscriber, now = Date.now()) {
  const e = subscriber?.subscriber?.entitlements?.[ENTITLEMENT];
  if (!e) return null;
  const expiresAt = e.expires_date ? new Date(e.expires_date) : new Date('9999-12-31T00:00:00Z');
  return +expiresAt > now ? { source: 'store', expiresAt, product: e.product_identifier ?? null } : null;
}

/** RevenueCat REST v1 lookup; null when not configured. Throws when RevenueCat can't answer, so an outage never reads as "cancelled". */
export const revenueCat = (secret, get = fetch) => async (appUserId) => {
  if (!secret) return null;
  const r = await get(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, { headers: { authorization: `Bearer ${secret}` } });
  if (!r.ok) throw new Error(`RevenueCat ${r.status}`);
  return r.json();
};
