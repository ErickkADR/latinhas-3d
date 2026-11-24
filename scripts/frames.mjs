// Tira uma sequência de prints durante a troca de tema (para conferir giro, blur e implosão).
import { chromium } from 'playwright';
const [url, outPrefix, theme = 'cereja', w = 1440, h = 900] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
await p.click(`[data-theme=${theme}]`);
for (let i = 0; i < 6; i++) { await p.waitForTimeout(220); await p.screenshot({ path: `${outPrefix}-${i}.jpg`, quality: 60 }); }
await b.close();
