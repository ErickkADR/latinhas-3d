// Captura a lata de cada tema (modo ?shot=) em PNG grande, como sairia de um "print" de designer.
// Essas são as imagens CRUAS dos cards; o scripts/optimize-images.mjs gera as versões WebP.
//   node scripts/capture-cards.mjs http://localhost:5180
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { THEMES } from '../src/config/themes.js';

const base = process.argv[2] ?? 'http://localhost:5180';
const out = new URL('../assets-src/img-raw/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 1200 }, deviceScaleFactor: 2 });
for (const t of THEMES) {
  await p.goto(`${base}/?shot=${t.id}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(4500);
  await p.screenshot({ path: `${out}card-${t.id}.png` });
  console.log('card', t.id);
}
// imagem de compartilhamento (og:image), 1200x630
const og = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.goto(base, { waitUntil: 'networkidle' });
await og.waitForTimeout(4500);
await og.screenshot({ path: `${out}og.png` });
console.log('og');
await b.close();
