import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPlus, lapsed, storePlan } from './billing.mjs';

const NOW = Date.UTC(2026, 10, 12);
test('plus is active until it expires; store plans re-check after', () => {
  const d = { plan: { source: 'store', expiresAt: new Date(NOW - 1) } };
  assert.equal(isPlus(d, NOW), false);
  assert.equal(lapsed(d, NOW), true);
  assert.equal(isPlus({ plan: { source: 'dev', expiresAt: new Date(NOW + 1e6) } }, NOW), true);
});

test('reads the plus entitlement from RevenueCat', () => {
  const sub = (expires) => ({ subscriber: { entitlements: { plus: { expires_date: expires, product_identifier: 'manendi.plus.annual' } } } });
  assert.equal(storePlan(sub('2027-11-12T00:00:00Z'), NOW).product, 'manendi.plus.annual');
  assert.equal(storePlan(sub('2026-01-01T00:00:00Z'), NOW), null);
  assert.equal(storePlan(sub(null), NOW).expiresAt.getUTCFullYear(), 9999);
  assert.equal(storePlan({ subscriber: { entitlements: {} } }, NOW), null);
});
