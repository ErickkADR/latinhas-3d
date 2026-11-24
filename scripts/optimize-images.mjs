// Imagens: assets-src/img-raw/*.png (prints em 2x, ~1 MB cada) -> public/img/*.webp em 480 e 960 px + og.jpg
//   node scripts/optimize-images.mjs        (grava a tabela em reports/images.md)
import sharp from 'sharp';
import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';

const RAW = new URL('../assets-src/img-raw/', import.meta.url).pathname;
const OUT = new URL('../public/img/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
const rows = [];
const kb = (b) => (b / 1024).toFixed(1) + ' KB';

for (const f of (await readdir(RAW)).filter((f) => f.startsWith('card-') && f.endsWith('.png'))) {
  const name = f.replace('.png', '');
  const before = (await stat(RAW + f)).size;
  const sizes = [];
  for (const w of [480, 960]) {
    const out = `${OUT}${name}-${w}.webp`;
    // 4:5, mesmo enquadramento do card; recorte centrado
    await sharp(RAW + f).resize(w, Math.round(w * 1.25), { fit: 'cover', position: 'centre' }).webp({ quality: 72, effort: 6, smartSubsample: true }).toFile(out);
    sizes.push((await stat(out)).size);
  }
  rows.push(`| ${name} | ${kb(before)} | ${kb(sizes[0])} | ${kb(sizes[1])} |`);
}
await sharp(RAW + 'og.png').resize(1200, 630).jpeg({ quality: 78, mozjpeg: true }).toFile(OUT + 'og.jpg');
rows.push(`| og (compartilhamento) | ${kb((await stat(RAW + 'og.png')).size)} | ${kb((await stat(OUT + 'og.jpg')).size)} (JPG 1200) | |`);

const md = ['| Imagem | PNG original (2x) | WebP 480 | WebP 960 |', '|---|---:|---:|---:|', ...rows].join('\n');
await writeFile(new URL('../reports/images.md', import.meta.url), md + '\n');
console.log(md);
