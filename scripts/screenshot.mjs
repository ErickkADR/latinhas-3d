import { chromium } from 'playwright';
const [url, out, w = 1440, h = 900, action = ''] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
p.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
p.on('pageerror', (e) => logs.push(`[pageerror] ${e.stack}`));
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(3500);
await p.mouse.move(+w * 0.7, +h * 0.35);
await p.waitForTimeout(1200);
if (action) { await eval(`(async()=>{${action}})()`); }
await p.screenshot({ path: out });
console.log([...new Set(logs)].slice(0, 25).join('\n'));
await b.close();
