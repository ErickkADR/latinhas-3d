// Junta prints numa grade (para revisar sequências de animação de uma vez).
import sharp from 'sharp';
const [out, cols, ...files] = process.argv.slice(2);
const W = 720, H = 450, c = +cols;
const imgs = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(W, H, { fit: 'contain' }).toBuffer(), left: (i % c) * W, top: Math.floor(i / c) * H })));
await sharp({ create: { width: W * c, height: H * Math.ceil(files.length / c), channels: 3, background: '#000' } }).composite(imgs).jpeg({ quality: 72 }).toFile(out);
