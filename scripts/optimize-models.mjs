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
import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Geometria extrudada (anel da lata, gomos do limão) sai do gerador SEM índice: 3 vértices por triângulo,
// normal por face. Nada solda e o simplificador não tem o que colapsar. Este passo recalcula as normais
// por ângulo de vinco (arestas vivas continuam vivas) e reindexa, juntando o que é igual.
function reindexCreased(angle = Math.PI / 5) {
  return (doc) => {
    for (const mesh of doc.getRoot().listMeshes())
      for (const prim of mesh.listPrimitives()) {
        if (prim.getIndices()) continue;
        const pos = prim.getAttribute('POSITION');
        const uv = prim.getAttribute('TEXCOORD_0');
        let g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos.getArray().slice(), 3));
        if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv.getArray().slice(), 2));
        g = mergeVertices(toCreasedNormals(g, angle), 1e-6);
        const buffer = pos.getBuffer();
        prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes.position.array)).setBuffer(buffer));
        prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes.normal.array)).setBuffer(buffer));
        if (uv) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(g.attributes.uv.array)).setBuffer(buffer));
        prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.index.array)).setBuffer(buffer));
      }
  };
}

const RAW = new URL('../assets-src/models-raw/', import.meta.url).pathname;
const OUT = new URL('../public/models/', import.meta.url).pathname;

// A textura "escovada" do metal (3,6 MB em PNG 2K) vira ruído liso quando reduzida e não muda nada na tela.
// Sem ela, as UVs do metal também sobram, e sem UV os vértices da emenda soldam.
function dropMetalTexture(name = 'Aluminium', roughness = 0.36) {
  return (doc) => {
    for (const mat of doc.getRoot().listMaterials()) {
      if (mat.getName() !== name || !mat.getMetallicRoughnessTexture()) continue;
      mat.setMetallicRoughnessTexture(null).setRoughnessFactor(roughness);
    }
    for (const mesh of doc.getRoot().listMeshes())
      for (const prim of mesh.listPrimitives())
        if (prim.getMaterial()?.getName() === name) prim.setAttribute('TEXCOORD_0', null);
  };
}

// Quanto simplificar cada um. A lata é o herói (fica grande na tela), os elementos aparecem pequenos.
// A estampa embutida na lata vai em 256 px: ela nunca aparece (reveal="manual" só revela a lata depois que a
// estampa gerada no canvas é aplicada). As bordas da lata ficam travadas para a emenda do UV não abrir.
const PLAN = {
  can: { ratio: 0.18, error: 0.0004, lockBorder: true, base: 256, other: 256 },
  default: { ratio: 0.12, error: 0.006, lockBorder: false, base: 512, other: 256 },
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
    reindexCreased(),
    ...(name === 'can' ? [dropMetalTexture()] : []),
    flatten(),
    join(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: plan.ratio, error: plan.error, lockBorder: plan.lockBorder }),
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
