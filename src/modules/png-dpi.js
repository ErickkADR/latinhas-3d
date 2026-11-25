// Grava o DPI no PNG (chunk pHYs): LightBurn/EzCad e o CorelDRAW importam a imagem já no tamanho físico certo (408 x 188 mm).
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (bytes) => { let c = 0xffffffff; for (const b of bytes) c = TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export async function withDpi(blob, dpi) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254); // pixels por metro
  const chunk = new Uint8Array(21); // 4 comprimento + 4 tipo + 9 dados + 4 crc
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1; // unidade: metro
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const at = 8 + 25; // assinatura PNG (8) + IHDR (4+4+13+4)
  const out = new Uint8Array(buf.length + chunk.length);
  out.set(buf.subarray(0, at)); out.set(chunk, at); out.set(buf.subarray(at), at + chunk.length);
  return new Blob([out], { type: 'image/png' });
}
