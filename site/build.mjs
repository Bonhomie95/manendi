// The store's privacy, terms, support and erase pages as an always-on static site: the free API sleeps outside its
// keep-awake window, and a reviewer shouldn't wait a minute for the privacy policy. The API renders the pages with the
// contact details set on Render, so nothing personal lives in this repo. Render rebuilds this on every push to main.
import { execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const API = process.env.API_URL ?? 'https://manendi-api.onrender.com';
const PAGES = ['privacy', 'terms', 'support', 'erase'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(page) {
  // A sleeping free instance takes about a minute to wake: keep asking for up to ~4 minutes.
  for (let i = 0; i < 12; i++) {
    try {
      const r = await fetch(`${API}/${page}`, { signal: AbortSignal.timeout(90_000) });
      if (r.ok && (r.headers.get('content-type') ?? '').includes('text/html')) return r.text();
    } catch { /* still waking */ }
    await wait(20_000);
  }
  throw new Error(`${API}/${page} never answered`);
}

// A push rebuilds this site and redeploys the API at the same moment. Wait until the API runs the last commit that
// touched server/ (Render only redeploys it then), so pages that just changed aren't copied from the old instance.
const want = (() => { try { return execSync('git log -1 --format=%H -- server', { encoding: 'utf8' }).trim(); } catch { return ''; } })();
for (let i = 0; want && i < 30; i++) { // up to ~10 minutes
  const h = await fetch(`${API}/health`, { signal: AbortSignal.timeout(90_000) }).then((r) => r.json()).catch(() => null);
  if (h?.commit === want) break;
  if (i === 29) console.warn(`API never reported ${want.slice(0, 7)}; copying the pages it serves now`);
  else await wait(20_000);
}

for (const page of PAGES) {
  const html = await get(page);
  await mkdir(`site/public/${page}`, { recursive: true });
  await writeFile(`site/public/${page}/index.html`, html);
  if (page === 'support') await writeFile('site/public/index.html', html);
  console.log(`${page}: ${html.length} bytes`);
}
