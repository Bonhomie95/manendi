import { strict as assert } from 'node:assert';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { identity } from './identity.mjs';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256' };
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (claims, head = { alg: 'RS256', kid: 'k1' }) => {
  const body = `${enc(head)}.${enc(claims)}`;
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`;
};
const now = () => 1_800_000_000_000;
const exp = now() / 1000 + 600;
let fetches = 0;
const get = async () => { fetches++; return { ok: true, json: async () => ({ keys: [jwk] }) }; };
const verify = identity({ audiences: { google: ['web.apps', 'ios.apps'], apple: ['dev.bonhomieinc.manendi'] }, get, now });

test('a real Google token gives the account', async () => {
  const id = await verify('google', jwt({ iss: 'https://accounts.google.com', aud: 'ios.apps', sub: '42', email: 'a@b.co', name: 'Ada', exp }));
  assert.deepEqual(id, { sub: '42', email: 'a@b.co', name: 'Ada' });
});

test('Apple tokens check the bundle ID', async () => {
  const ok = await verify('apple', jwt({ iss: 'https://appleid.apple.com', aud: 'dev.bonhomieinc.manendi', sub: 'x', exp }));
  assert.equal(ok.sub, 'x');
  await assert.rejects(verify('apple', jwt({ iss: 'https://appleid.apple.com', aud: 'com.other.app', sub: 'x', exp })), { status: 401 });
});

test('expired, foreign, forged and malformed tokens are refused', async () => {
  const good = { iss: 'accounts.google.com', aud: 'web.apps', sub: '1', exp };
  await assert.rejects(verify('google', jwt({ ...good, exp: now() / 1000 - 1 })), { status: 401 });
  await assert.rejects(verify('google', jwt({ ...good, iss: 'https://evil.example' })), { status: 401 });
  await assert.rejects(verify('google', jwt({ ...good, aud: 'someone-else.apps' })), { status: 401 });
  await assert.rejects(verify('google', jwt(good, { alg: 'none', kid: 'k1' })), { status: 401 });
  const [h, , s] = jwt(good).split('.');
  await assert.rejects(verify('google', `${h}.${enc({ ...good, sub: '2' })}.${s}`), { status: 401 });
  await assert.rejects(verify('google', 'not-a-token'), { status: 401 });
  await assert.rejects(verify('google', jwt(good, { alg: 'RS256', kid: 'gone' })), { status: 401 });
});

test('keys are cached between sign-ins', async () => {
  const before = fetches;
  await verify('google', jwt({ iss: 'accounts.google.com', aud: 'web.apps', sub: '1', exp }));
  assert.equal(fetches, before);
});

test('a provider without client IDs is off', async () => {
  const off = identity({ audiences: { google: [], apple: [] }, get, now });
  await assert.rejects(off('google', jwt({})), { status: 503 });
});
