// Optional sign-in. The app gets an ID token from the native Google or Apple sheet; we check it here against the
// provider's published keys (RS256, node:crypto, no library) and get back who it is.
import { createPublicKey, verify } from 'node:crypto';

const PROVIDERS = {
  google: { jwks: 'https://www.googleapis.com/oauth2/v3/certs', issuers: ['https://accounts.google.com', 'accounts.google.com'] },
  apple: { jwks: 'https://appleid.apple.com/auth/keys', issuers: ['https://appleid.apple.com'] },
};
const fail = (status, error) => Object.assign(new Error(error), { status });
const part = (s) => JSON.parse(Buffer.from(s, 'base64url').toString());

/** audiences: { google: [web + iOS client IDs], apple: [bundle ID] }. Returns verify(provider, token) → { sub, email, name }. */
export function identity({ audiences, get = fetch, now = Date.now }) {
  const cache = new Map(); // provider → { at, keys: Map<kid, KeyObject> }
  async function keyFor(provider, kid) {
    let c = cache.get(provider);
    // Providers rotate keys: refetch on an unknown kid, at most once a minute.
    if (!c?.keys.has(kid) && (!c || now() - c.at > 60e3)) {
      const r = await get(PROVIDERS[provider].jwks).catch(() => null);
      if (!r?.ok) throw fail(503, 'Couldn’t reach the sign-in service. Try again.');
      const { keys } = await r.json();
      c = { at: now(), keys: new Map(keys.map((k) => [k.kid, createPublicKey({ key: k, format: 'jwk' })])) };
      cache.set(provider, c);
    }
    return c.keys.get(kid);
  }

  return async function verifyToken(provider, token) {
    const p = PROVIDERS[provider];
    if (!p) throw fail(400, 'Unknown sign-in');
    if (!audiences[provider]?.length) throw fail(503, 'This sign-in isn’t switched on yet');
    const bad = fail(401, 'That sign-in didn’t check out. Try again.');
    const [h, b, sig] = typeof token === 'string' ? token.split('.') : [];
    if (!sig) throw bad;
    let head, claims;
    try { head = part(h); claims = part(b); } catch { throw bad; }
    if (head.alg !== 'RS256') throw bad;
    const key = await keyFor(provider, head.kid);
    if (!key || !verify('RSA-SHA256', Buffer.from(`${h}.${b}`), key, Buffer.from(sig, 'base64url'))) throw bad;
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!p.issuers.includes(claims.iss) || !aud.some((a) => audiences[provider].includes(a))) throw bad;
    if (!claims.sub || !(claims.exp * 1000 > now())) throw bad;
    return { sub: String(claims.sub), email: typeof claims.email === 'string' ? claims.email : null, name: typeof claims.name === 'string' ? claims.name : null };
  };
}
