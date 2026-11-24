// Gera os modelos 3D do projeto de forma procedural (three.js para a geometria, gltf-transform para escrever o .glb).
// Saída CRUA, no padrão "exportei do Blender e joguei na pasta": malha muito densa, texturas PNG 4K, nada comprimido.
// É o ponto de partida que o scripts/optimize-models.mjs transforma no que vai para produção.
//
//   node scripts/generate-models.mjs            -> assets-src/models-raw/*.glb
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = new URL('../assets-src/models-raw/', import.meta.url);
const SEG = 256; // densidade de "export padrão": muito acima do necessário para a lata ocupar ~40% da tela

// ---------- helpers ----------
function addPrimitive(doc, mesh, geometry, material) {
  const buffer = doc.getRoot().listBuffers()[0];
  const g = geometry.index ? geometry : geometry; // índice opcional
  g.computeVertexNormals?.();
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  const prim = doc.createPrimitive().setMaterial(material);
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos.array)).setBuffer(buffer));
  if (nor) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor.array)).setBuffer(buffer));
  if (uv) {
    // three usa v para cima; glTF usa v para baixo
    const a = new Float32Array(uv.array);
    for (let i = 1; i < a.length; i += 2) a[i] = 1 - a[i];
    prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(a).setBuffer(buffer));
  }
  if (g.index) prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.index.array)).setBuffer(buffer));
  mesh.addPrimitive(prim);
  return prim;
}

function newDoc(name) {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene(name);
  doc.getRoot().setDefaultScene(scene);
  const mesh = doc.createMesh(name);
  scene.addChild(doc.createNode(name).setMesh(mesh));
  return { doc, mesh };
}

function mat(doc, name, hex, { metal = 0, rough = 0.5, double = false } = {}) {
  const c = new THREE.Color(hex); // sRGB -> linear (three converte ao ler hex)
  return doc.createMaterial(name).setBaseColorFactor([c.r, c.g, c.b, 1]).setMetallicFactor(metal).setRoughnessFactor(rough).setDoubleSided(double);
}

const xform = (geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1 } = {}) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
  return geo.applyMatrix4(m);
};

const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));

async function png(svg, w, h) {
  return sharp(Buffer.from(svg)).resize(w, h).png({ compressionLevel: 6 }).toBuffer();
}

async function noisePng(w, h, base, spread, streak = true) {
  // ruído "escovado" para a rugosidade do alumínio
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    let row = Math.random() * spread;
    for (let x = 0; x < w; x++) {
      const n = streak ? row * 0.6 + Math.random() * spread * 0.4 : Math.random() * spread;
      const v = Math.max(0, Math.min(255, base + n - spread / 2));
      const i = (y * w + x) * 3;
      data[i] = 255; data[i + 1] = v; data[i + 2] = 0; // G = roughness, B = metalness (0: o fator decide)
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

function texture(doc, name, buf) {
  return doc.createTexture(name).setImage(buf).setMimeType('image/png');
}

// ---------- lata ----------
async function buildCan() {
  const { doc, mesh } = newDoc('can');
  const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="2048">
    <rect width="4096" height="2048" fill="#ffd84d"/>
    <text x="2048" y="1180" font-family="Helvetica, Arial" font-weight="900" font-size="380" text-anchor="middle" fill="#1b1b1b">LATINHA</text>
    <text x="2048" y="1420" font-family="Helvetica, Arial" font-size="120" text-anchor="middle" fill="#1b1b1b">personalizada · 350 ml</text>
  </svg>`;
  const label = mat(doc, 'Label', '#ffffff', { metal: 0.35, rough: 0.32 })
    .setBaseColorTexture(texture(doc, 'label', await png(labelSvg, 4096, 2048)));
  const metalTex = texture(doc, 'brushed', await noisePng(2048, 2048, 96, 70));
  const metal = mat(doc, 'Aluminium', '#b9bfc7', { metal: 1, rough: 1, double: true }).setMetallicRoughnessTexture(metalTex);

  // corpo (área da estampa): thetaStart = PI faz u = 0.5 ficar de frente para a câmera (+Z)
  const body = new THREE.CylinderGeometry(0.033, 0.033, 0.093, SEG, 32, true, Math.PI, Math.PI * 2);
  addPrimitive(doc, mesh, xform(body, { y: 0.0115 + 0.0465 }), label);

  const bottom = new THREE.LatheGeometry(v2([[0, 0.0045], [0.012, 0.0035], [0.019, 0.0016], [0.0225, 0.0002], [0.025, 0], [0.0275, 0.0012], [0.030, 0.0042], [0.0322, 0.0085], [0.033, 0.0115]]), SEG);
  addPrimitive(doc, mesh, bottom, metal);

  const top = new THREE.LatheGeometry(v2([[0.033, 0.1045], [0.0327, 0.1075], [0.0312, 0.1115], [0.0290, 0.1158], [0.0279, 0.1192], [0.0278, 0.1212], [0.0284, 0.1226], [0.0280, 0.1236], [0.0270, 0.1232], [0.0264, 0.1215], [0.0259, 0.1188], [0.0250, 0.1178], [0.0, 0.1176]]), SEG);
  addPrimitive(doc, mesh, top, metal);

  // anel (lacre): retângulo arredondado com furo, deitado na tampa
  const tab = new THREE.Shape();
  const w = 0.0095, h = 0.0062, r = 0.0045;
  tab.moveTo(-w + r, -h); tab.lineTo(w - r, -h); tab.quadraticCurveTo(w, -h, w, -h + r); tab.lineTo(w, h - r);
  tab.quadraticCurveTo(w, h, w - r, h); tab.lineTo(-w + r, h); tab.quadraticCurveTo(-w, h, -w, h - r); tab.lineTo(-w, -h + r); tab.quadraticCurveTo(-w, -h, -w + r, -h);
  const hole = new THREE.Path(); hole.absellipse(0.0035, 0, 0.0042, 0.0034, 0, Math.PI * 2, true);
  tab.holes.push(hole);
  const tabGeo = new THREE.ExtrudeGeometry(tab, { depth: 0.0005, bevelEnabled: true, bevelThickness: 0.0002, bevelSize: 0.0002, bevelSegments: 4, curveSegments: 64 });
  addPrimitive(doc, mesh, xform(tabGeo, { rx: -Math.PI / 2, y: 0.1182, z: 0.004, ry: Math.PI / 2 }), metal);
  addPrimitive(doc, mesh, xform(new THREE.CylinderGeometry(0.0016, 0.0018, 0.0012, 64), { y: 0.118 }), metal);
  return doc;
}

// ---------- elementos decorativos ----------
function lemonSlice() {
  const { doc, mesh } = newDoc('lemon');
  const rind = mat(doc, 'Rind', '#f2c21b', { rough: 0.45 });
  const pith = mat(doc, 'Pith', '#fff6d6', { rough: 0.6 });
  const flesh = mat(doc, 'Flesh', '#ffe066', { rough: 0.22 });
  const t = 0.18;
  addPrimitive(doc, mesh, new THREE.CylinderGeometry(1, 1, t, SEG, 4, true), rind);
  for (const s of [1, -1]) {
    addPrimitive(doc, mesh, xform(new THREE.RingGeometry(0.9, 1, SEG, 2), { rx: -s * Math.PI / 2, y: s * t / 2 }), rind);
    addPrimitive(doc, mesh, xform(new THREE.CircleGeometry(0.9, SEG), { rx: -s * Math.PI / 2, y: s * (t / 2 - 0.004) }), pith);
  }
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.06, a1 = ((i + 1) / n) * Math.PI * 2 - 0.06;
    const sh = new THREE.Shape();
    sh.moveTo(Math.cos((a0 + a1) / 2) * 0.1, Math.sin((a0 + a1) / 2) * 0.1);
    sh.lineTo(Math.cos(a0) * 0.8, Math.sin(a0) * 0.8);
    sh.absarc(0, 0, 0.8, a0, a1, false);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: t * 0.7, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 6, curveSegments: 48 });
    addPrimitive(doc, mesh, xform(g, { rx: -Math.PI / 2, y: -t * 0.35 }), flesh);
  }
  return doc;
}

function cherry() {
  const { doc, mesh } = newDoc('cherry');
  const red = mat(doc, 'Cherry', '#c40d2e', { rough: 0.16 });
  const stem = mat(doc, 'Stem', '#5f7a25', { rough: 0.6 });
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI;
    const r = Math.sin(a) * (1 + 0.06 * Math.sin(a * 2));
    let y = -Math.cos(a) * 0.95;
    y -= 0.28 * Math.exp(-(((Math.PI - a) / 0.38) ** 2));
    pts.push([Math.max(r, 0.0001), y]);
  }
  pts[0][0] = 0; pts[pts.length - 1][0] = 0;
  addPrimitive(doc, mesh, new THREE.LatheGeometry(v2(pts), SEG), red);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.62, 0), new THREE.Vector3(0.12, 1.3, 0.04), new THREE.Vector3(0.45, 2.0, 0.08), new THREE.Vector3(0.85, 2.4, 0.1)]);
  addPrimitive(doc, mesh, new THREE.TubeGeometry(curve, 128, 0.045, 24, false), stem);
  return doc;
}

function blueberry() {
  const { doc, mesh } = newDoc('blueberry');
  const skin = mat(doc, 'Skin', '#3d4f9f', { rough: 0.55 });
  const crown = mat(doc, 'Crown', '#23285a', { rough: 0.7 });
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI;
    let y = -Math.cos(a) * 0.86;
    y -= 0.16 * Math.exp(-(((Math.PI - a) / 0.32) ** 2));
    pts.push([Math.sin(a), y]);
  }
  pts[0][0] = 0; pts[pts.length - 1][0] = 0;
  addPrimitive(doc, mesh, new THREE.LatheGeometry(v2(pts), SEG), skin);
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.1 : 0.26, a = (i / 10) * Math.PI * 2;
    i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(star, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4 });
  addPrimitive(doc, mesh, xform(g, { rx: -Math.PI / 2, y: 0.66 }), crown);
  return doc;
}

function mintLeaf() {
  const { doc, mesh } = newDoc('mint');
  const leafM = mat(doc, 'Leaf', '#2fa356', { rough: 0.5, double: true });
  const vein = mat(doc, 'Vein', '#8fdc9f', { rough: 0.5 });
  const sh = new THREE.Shape();
  sh.moveTo(0, -1.1);
  sh.bezierCurveTo(0.75, -0.7, 0.62, 0.55, 0, 1.15);
  sh.bezierCurveTo(-0.62, 0.55, -0.75, -0.7, 0, -1.1);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 160, steps: 1 });
  // dobra no meio e curva no comprimento
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, p.getZ(i) + Math.abs(x) * 0.35 - (y * y) * 0.12);
  }
  g.computeVertexNormals();
  addPrimitive(doc, mesh, g, leafM);
  const curve = new THREE.CatmullRomCurve3([-1.05, -0.5, 0, 0.5, 1.05].map((y) => new THREE.Vector3(0, y, 0.045 - y * y * 0.12)));
  addPrimitive(doc, mesh, new THREE.TubeGeometry(curve, 96, 0.022, 12, false), vein);
  return doc;
}

function star() {
  const { doc, mesh } = newDoc('star');
  const gold = mat(doc, 'Star', '#ffd23f', { metal: 0.25, rough: 0.3 });
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.46 : 1, a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 12 });
  addPrimitive(doc, mesh, xform(g, { z: -0.11 }), gold);
  return doc;
}

await mkdir(OUT, { recursive: true });
const io = new NodeIO();
const all = { can: await buildCan(), lemon: lemonSlice(), cherry: cherry(), blueberry: blueberry(), mint: mintLeaf(), star: star() };
for (const [name, doc] of Object.entries(all)) {
  const file = new URL(`${name}.glb`, OUT);
  await io.write(file.pathname, doc);
  const { size } = await import('node:fs').then((fs) => fs.statSync(file));
  console.log(`${name.padEnd(10)} ${(size / 1024).toFixed(0).padStart(7)} KB`);
}
