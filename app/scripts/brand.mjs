// Generates every icon/splash asset from one vector mark.  Run: node scripts/brand.mjs
// A seal with a quarter missing (the clock still running), a doorway, and a dot — you, inside, staying.
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const C = { ink: '#0F1B2D', ink2: '#1C2E4A', gold: '#E2B54A', mint: '#3CCB98', stamp: '#E4572E' };
const ROOT = resolve(import.meta.dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Geometry on a 1024 canvas — the same numbers as <Mark/> in src/components/brand.tsx.
const parts = ({ ring = C.gold, arch = C.mint, dot = C.stamp } = {}) => ({
  ring: `<path d="M872 512A360 360 0 1 1 512 152" fill="none" stroke="${ring}" stroke-width="64"/>`,
  arch: `<path d="M394 712V502a118 118 0 0 1 236 0v210" fill="none" stroke="${arch}" stroke-width="64"/>`,
  dot: `<circle cx="512" cy="640" r="46" fill="${dot}"/>`,
});
const mark = (scale = 1, colors) => {
  const p = parts(colors);
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${p.ring}${p.arch}${p.dot}</g>`;
};
const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.ink2}"/><stop offset="1" stop-color="${C.ink}"/></linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#2F4A74" stop-opacity="0.9"/><stop offset="1" stop-color="#2F4A74" stop-opacity="0"/></radialGradient></defs>
<rect width="1024" height="1024" fill="url(#g)"/><rect width="1024" height="1024" fill="url(#glow)"/>`;
const svg = (body, size = 1024) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`;

const tmp = join(tmpdir(), 'manendi-brand');
mkdirSync(tmp, { recursive: true });
mkdirSync(join(ROOT, 'assets/images'), { recursive: true });
mkdirSync(join(ROOT, 'assets/brand'), { recursive: true });
function png(name, body, size = 1024) {
  const html = join(tmp, `${name}.html`);
  writeFileSync(html, `<html><body style="margin:0;background:transparent">${svg(body, size)}</body></html>`);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--default-background-color=00000000', `--window-size=${size},${size}`, `--screenshot=${join(ROOT, 'assets/images', name + '.png')}`, `file://${html}`], { stdio: 'ignore' });
}

const white = { ring: '#fff', arch: '#fff', dot: '#fff' };
writeFileSync(join(ROOT, 'assets/brand/mark.svg'), svg(mark()));
writeFileSync(join(ROOT, 'assets/brand/icon.svg'), svg(bg + mark(0.86)));

png('icon', bg + mark(0.86));                               // 1024 opaque, fallback/legacy
png('android-icon-foreground', mark(0.7));                  // inside the 66dp safe zone
png('android-icon-background', bg);
png('android-icon-monochrome', mark(0.7, white));
png('splash-icon', mark(1));                                // transparent, sized by imageWidth
png('favicon', bg + mark(0.86), 196);
png('notification-icon', mark(1.05, white), 96);            // Android status bar: white on transparent

// iOS 26 Icon Composer (.icon): the seal and the dot on separate glass layers.
const ic = join(ROOT, 'assets/manendi.icon');
mkdirSync(join(ic, 'Assets'), { recursive: true });
const p = parts();
const big = (body) => svg(`<g transform="translate(512 512) scale(0.86) translate(-512 -512)">${body}</g>`);
writeFileSync(join(ic, 'Assets/seal.svg'), big(p.ring + p.arch));
writeFileSync(join(ic, 'Assets/you.svg'), big(p.dot));
const layer = (n) => ({ 'image-name': `${n}.svg`, name: n, position: { scale: 1, 'translation-in-points': [0, 0] } });
writeFileSync(join(ic, 'icon.json'), JSON.stringify({
  fill: { 'automatic-gradient': 'extended-srgb:0.05882,0.10588,0.17647,1.00000' },
  groups: [
    { layers: [layer('you')], shadow: { kind: 'layer-color', opacity: 0.6 }, translucency: { enabled: true, value: 0.1 } },
    { layers: [layer('seal')], shadow: { kind: 'neutral', opacity: 0.5 }, translucency: { enabled: true, value: 0.15 } },
  ],
  'supported-platforms': { circles: ['watchOS'], squares: 'shared' },
}, null, 2));
console.log('brand assets written');
