// Mede o custo do loop em tempo de execução: 6 s de mouse mexendo sobre o herói.
// Conta layouts forçados (LayoutCount), recálculos de estilo, tempo de script e o FPS real (rAF).
//   node scripts/measure-runtime.mjs http://localhost:4173 antes
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const [url, label = 'atual'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const results = [];
for (const [form, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Performance.enable');
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(5000);
  const get = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await p.evaluate(() => { window.__frames = 0; const f = () => { window.__frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const a = await get();
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < 6000) {
    const t = i++ / 20;
    await p.mouse.move(vp.width / 2 + Math.cos(t) * vp.width * 0.35, vp.height / 2 + Math.sin(t * 1.3) * vp.height * 0.3);
    await p.waitForTimeout(16);
  }
  const secs = (Date.now() - t0) / 1000;
  const z = await get();
  const frames = await p.evaluate(() => window.__frames);
  results.push({
    form,
    layoutsPerSec: (z.LayoutCount - a.LayoutCount) / secs,
    layoutMsPerSec: ((z.LayoutDuration - a.LayoutDuration) * 1000) / secs,
    styleMsPerSec: ((z.RecalcStyleDuration - a.RecalcStyleDuration) * 1000) / secs,
    scriptMsPerSec: ((z.ScriptDuration - a.ScriptDuration) * 1000) / secs,
    fps: frames / secs,
  });
  await p.close();
}
await b.close();
const md = [
  `### Loop em execução: ${label}`, '',
  '| | Layouts/s | Layout (ms/s) | Estilo (ms/s) | Script (ms/s) | FPS (headless) |',
  '|---|---:|---:|---:|---:|---:|',
  ...results.map((r) => `| ${r.form === 'mobile' ? 'Celular (390 px)' : 'Desktop (1440 px)'} | ${r.layoutsPerSec.toFixed(1)} | ${r.layoutMsPerSec.toFixed(1)} | ${r.styleMsPerSec.toFixed(1)} | ${r.scriptMsPerSec.toFixed(0)} | ${r.fps.toFixed(0)} |`),
  '',
].join('\n');
mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../reports/runtime-${label}.md`, import.meta.url), md);
console.log(md);
