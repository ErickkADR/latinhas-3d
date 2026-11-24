// Roda o Lighthouse (celular e desktop) numa URL e grava o resumo em reports/lighthouse-<rótulo>.md
//   node scripts/lighthouse.mjs http://localhost:4173 antes
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [url, label = 'atual', runs = '3'] = process.argv.slice(2);
mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
const bin = new URL('../node_modules/.bin/lighthouse', import.meta.url).pathname;
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const out = [];
for (const form of ['mobile', 'desktop']) {
  const res = [];
  for (let i = 0; i < +runs; i++) {
    const file = new URL(`../reports/lh-${label}-${form}-${i}.json`, import.meta.url).pathname;
    const args = [url, '--output=json', `--output-path=${file}`, '--quiet', '--chrome-flags=--headless=new --ignore-gpu-blocklist'];
    if (form === 'desktop') args.push('--preset=desktop');
    execFileSync(bin, args, { stdio: 'ignore' });
    const j = JSON.parse(readFileSync(file, 'utf8'));
    const c = j.categories, a = j.audits;
    res.push({
      perf: Math.round(c.performance.score * 100), a11y: Math.round(c.accessibility.score * 100), bp: Math.round(c['best-practices'].score * 100), seo: Math.round(c.seo.score * 100),
      fcp: a['first-contentful-paint'].numericValue, lcp: a['largest-contentful-paint'].numericValue, tbt: a['total-blocking-time'].numericValue,
      cls: a['cumulative-layout-shift'].numericValue, bytes: a['total-byte-weight'].numericValue, reqs: a['network-requests'].details.items.length,
      fails: Object.values(a).filter((x) => x.score !== null && x.score < 1 && ['accessibility', 'best-practices', 'seo'].some((k) => c[k].auditRefs.some((r) => r.id === x.id && r.weight > 0))).map((x) => x.id),
    });
  }
  const m = (k) => median(res.map((r) => r[k]));
  out.push({ form, perf: m('perf'), a11y: m('a11y'), bp: m('bp'), seo: m('seo'), fcp: m('fcp'), lcp: m('lcp'), tbt: m('tbt'), cls: m('cls'), bytes: m('bytes'), reqs: m('reqs'), fails: [...new Set(res.flatMap((r) => r.fails))] });
}

const s = (ms) => (ms / 1000).toFixed(1) + ' s';
const md = [
  `### ${label} (${url}, mediana de ${runs} execuções)`, '',
  '| | Performance | Acessibilidade | Boas Práticas | SEO | FCP | LCP | TBT | CLS | Peso | Requisições |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...out.map((r) => `| ${r.form === 'mobile' ? 'Celular' : 'Desktop'} | ${r.perf} | ${r.a11y} | ${r.bp} | ${r.seo} | ${s(r.fcp)} | ${s(r.lcp)} | ${Math.round(r.tbt)} ms | ${r.cls.toFixed(3)} | ${(r.bytes / 1048576).toFixed(2)} MB | ${r.reqs} |`),
  '', ...out.filter((r) => r.fails.length).map((r) => `Falhas (${r.form}): ${r.fails.join(', ')}`), '',
].join('\n');
writeFileSync(new URL(`../reports/lighthouse-${label}.md`, import.meta.url), md);
console.log(md);
