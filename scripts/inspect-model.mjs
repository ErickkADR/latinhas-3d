// Mostra o que pesa dentro de um .glb: texturas (formato, tamanho) e cada primitiva (vértices, triângulos, material).
//   node scripts/inspect-model.mjs public/models/can.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  console.log(`\n${file}`);
  for (const t of doc.getRoot().listTextures()) console.log(`  textura ${t.getName() || '-'} ${t.getMimeType()} ${t.getSize()?.join('x')} ${(t.getImage().byteLength / 1024).toFixed(1)} KB`);
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const v = p.getAttribute('POSITION').getCount();
      const tr = (p.getIndices()?.getCount() ?? v) / 3;
      console.log(`  primitiva ${p.getMaterial()?.getName()} vértices ${v} triângulos ${tr} atributos ${p.listSemantics().join(',')}`);
    }
  console.log(`  nós: ${doc.getRoot().listNodes().length}  malhas: ${doc.getRoot().listMeshes().length}`);
}
