// The store's privacy, terms, support and erase pages as an always-on static site: the free API sleeps outside its
// keep-awake window, and a reviewer shouldn't wait a minute for the privacy policy. The API renders the pages with the
// contact details set on Render, so nothing personal lives in this repo. Render rebuilds this on every push to main.
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

for (const page of PAGES) {
  const html = await get(page);
  await mkdir(`site/public/${page}`, { recursive: true });
  await writeFile(`site/public/${page}/index.html`, html);
  if (page === 'support') await writeFile('site/public/index.html', html);
  console.log(`${page}: ${html.length} bytes`);
}
