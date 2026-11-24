// Perfil de CPU (CDP) por 4 s com o mouse mexendo: lista as funções com mais tempo próprio.
//   node scripts/profile.mjs http://localhost:4173 390 844
import { chromium } from 'playwright';
const [url, w = 1440, h = 900, label] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const cdp = await p.context().newCDPSession(p);
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(10000);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
const t0 = Date.now(); let i = 0;
while (Date.now() - t0 < 4000) { const t = i++ / 20; await p.mouse.move(+w / 2 + Math.cos(t) * w * 0.35, +h / 2 + Math.sin(t * 1.3) * h * 0.3); await p.waitForTimeout(16); }
const { profile } = await cdp.send('Profiler.stop');
const self = new Map();
const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map((n) => [n.id, n]));
profile.samples.forEach((id, k) => { const n = byId.get(id); const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`; self.set(key, (self.get(key) || 0) + (dt[k] || 0) / 1000); });
[...self.entries()].filter(([k]) => !k.startsWith('(idle)') && !k.startsWith('(program)')).sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log(v.toFixed(0).padStart(6), 'ms', k));
const busy = [...self.entries()].filter(([k]) => !k.startsWith('(idle)')).reduce((s, [, v]) => s + v, 0);
const bbox = [...self.entries()].filter(([k]) => /getVertexPosition|applyMatrix4|expandByPoint|traverseVisible|^min |^max |getX |getY |getZ /.test(k)).reduce((s, [, v]) => s + v, 0);
console.log(`TOTAL ocupado: ${busy.toFixed(0)} ms em 4000 ms (${(busy / 40).toFixed(1)}% da thread principal); caixa envolvente: ${bbox.toFixed(0)} ms`);
if (label) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(new URL('../reports/profile.md', import.meta.url), `| ${label} | ${w}x${h} | ${busy.toFixed(0)} ms | ${(busy / 40).toFixed(1)}% | ${bbox.toFixed(0)} ms |\n`);
}
await b.close();
