// Miniaturas quadradas (144 px) de cada tema para a grade lateral: recorte central do panorama (a parte que aparece de frente na lata).
//   node scripts/build-thumbs.mjs
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
const src = new URL('../assets-src/rotulos/', import.meta.url).pathname;
const out = new URL('../public/img/thumb/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
for (const f of (await readdir(src)).filter((x) => x.endsWith('.png'))) {
  const m = await sharp(src + f).metadata();
  const side = Math.round(m.height * 0.98);
  await sharp(src + f).extract({ left: Math.round((m.width - side) / 2), top: 0, width: side, height: side }).resize(144, 144).webp({ quality: 74, effort: 6 }).toFile(out + f.replace('.png', '.webp'));
}
console.log('ok');
