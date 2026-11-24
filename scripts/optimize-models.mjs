// Pipeline de otimização dos modelos: assets-src/models-raw/*.glb -> public/models/*.glb
// dedup -> flatten -> join -> weld -> simplify (Meshopt) -> texturas WebP redimensionadas -> Meshopt compression (quantiza + reordena)
//
//   node scripts/optimize-models.mjs          (grava a tabela antes/depois em reports/models.md)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, weld, simplify, textureCompress, meshopt, prune, getSceneVertexCount, VertexCountMethod } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';

const RAW = new URL('../assets-src/models-raw/', import.meta.url).pathname;
const OUT = new URL('../public/models/', import.meta.url).pathname;

// Quanto simplificar cada um. A lata é o herói (fica grande na tela), os elementos aparecem pequenos.
const PLAN = {
  can: { ratio: 0.18, error: 0.0004, base: 1024, other: 256 },
  default: { ratio: 0.12, error: 0.002, base: 512, other: 256 },
};

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});

const tris = (doc) => {
  let t = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) t += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  return Math.round(t);
};

await mkdir(OUT, { recursive: true });
const rows = [];
for (const file of (await readdir(RAW)).filter((f) => f.endsWith('.glb'))) {
  const name = file.replace('.glb', '');
  const plan = PLAN[name] ?? PLAN.default;
  const doc = await io.read(RAW + file);
  const before = { size: (await stat(RAW + file)).size, tris: tris(doc), verts: getSceneVertexCount(doc.getRoot().getDefaultScene(), VertexCountMethod.UPLOAD) };

  await doc.transform(
    dedup(),
    flatten(),
    join(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: plan.ratio, error: plan.error, lockBorder: true }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^baseColor/, resize: [plan.base, plan.base], quality: 82 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(?!baseColor)/, resize: [plan.other, plan.other], quality: 70 }),
    prune(),
    dedup(),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  await io.write(OUT + file, doc);
  const after = { size: (await stat(OUT + file)).size, tris: tris(doc), verts: getSceneVertexCount(doc.getRoot().getDefaultScene(), VertexCountMethod.UPLOAD) };
  rows.push({ name, before, after });
  console.log(`${name.padEnd(10)} ${(before.size / 1024).toFixed(0).padStart(6)} KB -> ${(after.size / 1024).toFixed(1).padStart(6)} KB   tris ${before.tris} -> ${after.tris}`);
}

const kb = (b) => (b / 1024).toFixed(b < 102400 ? 1 : 0);
const total = (k) => rows.reduce((s, r) => s + r[k].size, 0);
const md = [
  '| Modelo | Antes | Depois | Redução | Triângulos antes | Triângulos depois |',
  '|---|---:|---:|---:|---:|---:|',
  ...rows.map((r) => `| ${r.name} | ${kb(r.before.size)} KB | ${kb(r.after.size)} KB | ${(100 - (r.after.size / r.before.size) * 100).toFixed(1)}% | ${r.before.tris.toLocaleString('pt-BR')} | ${r.after.tris.toLocaleString('pt-BR')} |`),
  `| **Total** | **${kb(total('before'))} KB** | **${kb(total('after'))} KB** | **${(100 - (total('after') / total('before')) * 100).toFixed(1)}%** | | |`,
].join('\n');
await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
await writeFile(new URL('../reports/models.md', import.meta.url), md + '\n');
console.log('\n' + md);
