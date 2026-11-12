#!/usr/bin/env node
// Keeps Render free web services awake. Render spins a free service down after 15 idle minutes, and the next visitor
// waits about a minute while it boots. A ping every 5–10 minutes (random) keeps it warm.
//
//   node keepalive/keepalive.mjs          ping forever, every 5–10 minutes (any always-on machine)
//   node keepalive/keepalive.mjs --once   one round, then exit (cron, GitHub Actions)
//
// KEEPALIVE_URLS   comma-separated health URLs (default: the Manendi API)
// KEEPALIVE_HOURS  optional UTC window like "12-04" (12:00 → 04:00 UTC). Outside it nothing is pinged and the service
//                  may sleep. A free service awake 24/7 uses ~744 of the workspace's 750 free hours a month, and when
//                  they run out Render suspends EVERY free service in the workspace until the 1st. Split the day
//                  between apps, or move the live one to a paid instance.
// ponytail: delete this and .github/workflows/keep-awake.yml once the API is on a paid instance (those never sleep).
import { fileURLToPath } from 'node:url';

/** Is `hour` (0–23, UTC) inside "start-end"? Windows may wrap past midnight; no window means always. */
export function awake(hours, hour) {
  if (!hours) return true;
  const [a, b] = hours.split('-').map(Number);
  return a <= b ? hour >= a && hour < b : hour >= a || hour < b;
}

/** Free instance hours these services use in a 31-day month. */
export const monthlyHours = (hours, services = 1) =>
  Array.from({ length: 24 }, (_, h) => awake(hours, h)).filter(Boolean).length * 31 * services;

async function ping(url) {
  const t = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(90_000), headers: { 'user-agent': 'manendi-keepalive' } });
    const secs = (Date.now() - t) / 1000;
    if (r.status === 404 && r.headers.get('x-render-routing') === 'no-server') {
      console.log(`${url}: no Render service here yet, skipped`);
      return true;
    }
    console.log(`${url}: ${r.status} in ${secs.toFixed(1)}s${secs > 15 ? ' (it was asleep)' : ''}`);
    return r.ok;
  } catch (e) {
    console.log(`${url}: ${e.name === 'TimeoutError' ? 'no answer in 90s' : e.message}`);
    return false;
  }
}

async function round(urls, hours) {
  if (!awake(hours, new Date().getUTCHours())) {
    console.log(`outside KEEPALIVE_HOURS (${hours} UTC), letting it sleep`);
    return true;
  }
  return (await Promise.all(urls.map(ping))).every(Boolean);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const urls = (process.env.KEEPALIVE_URLS || 'https://manendi-api.onrender.com/health').split(',').map((s) => s.trim()).filter(Boolean);
  const hours = process.env.KEEPALIVE_HOURS?.trim();
  const budget = monthlyHours(hours, urls.length);
  console.log(`warming ${urls.length} service(s) ${hours ? `${hours} UTC` : '24/7'}: ~${budget} of the workspace's 750 free hours a month, plus whatever its other free services use`);
  if (budget > 750) console.warn('over 750: Render will suspend every free service in the workspace when the hours run out');

  if (process.argv.includes('--once')) process.exitCode = (await round(urls, hours)) ? 0 : 1;
  else for (;;) {
    await round(urls, hours);
    await new Promise((r) => setTimeout(r, (5 + Math.random() * 5) * 60_000));
  }
}
