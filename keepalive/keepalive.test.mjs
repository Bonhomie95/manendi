import assert from 'node:assert/strict';
import test from 'node:test';
import { awake, monthlyHours } from './keepalive.mjs';

test('no window means always awake', () => {
  assert.equal(awake(undefined, 3), true);
  assert.equal(monthlyHours(undefined), 744);
});

test('windows include the start hour and exclude the end hour', () => {
  assert.equal(awake('9-17', 9), true);
  assert.equal(awake('9-17', 16), true);
  assert.equal(awake('9-17', 17), false);
  assert.equal(monthlyHours('9-17'), 8 * 31);
});

test('windows can wrap past midnight', () => {
  assert.equal(awake('12-4', 23), true);
  assert.equal(awake('12-4', 0), true);
  assert.equal(awake('12-4', 4), false);
  assert.equal(awake('12-4', 11), false);
  assert.equal(monthlyHours('12-4', 2), 16 * 31 * 2);
});
