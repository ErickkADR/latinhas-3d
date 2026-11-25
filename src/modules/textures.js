// Gera a estampa da lata num <canvas>. O mapeamento UV do modelo coloca u = 0.5 de frente para a câmera,
// então o "rosto" da lata é o centro horizontal da imagem e as costas ficam nas bordas (x = 0 e x = W).
export const FONT = '"Bricolage Grotesque Variable", "Bricolage Grotesque", system-ui, sans-serif';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function fontsReady() {
  try {
    await Promise.all([document.fonts.load(`800 100px ${FONT}`), document.fonts.load(`500 40px ${FONT}`)]);
  } catch { /* sem a fonte, o canvas usa a do sistema */ }
}

// ---------- padrões ----------
const PATTERNS = {
  slices(ctx, W, H, c, r) {
    ctx.strokeStyle = c.deep; ctx.fillStyle = c.deep; ctx.lineWidth = H * 0.008;
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H, s = H * (0.05 + r() * 0.07);
      ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * s * 0.85, y + Math.sin(a) * s * 0.85); ctx.stroke();
      }
    }
  },
  dots(ctx, W, H, c) {
    ctx.fillStyle = c.deep; ctx.globalAlpha = 0.35;
    const step = H * 0.09;
    for (let y = 0, row = 0; y < H + step; y += step, row++)
      for (let x = (row % 2) * step * 0.5; x < W + step; x += step) {
        ctx.beginPath(); ctx.arc(x, y, step * 0.16, 0, Math.PI * 2); ctx.fill();
      }
  },
  waves(ctx, W, H, c) {
    ctx.strokeStyle = c.accent; ctx.globalAlpha = 0.28; ctx.lineWidth = H * 0.012;
    for (let y = 0; y < H + 60; y += H * 0.075) {
      ctx.beginPath();
      // período que fecha a volta da lata (sem emenda visível em x = 0 / x = W)
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin((x / W) * Math.PI * 2 * 6) * H * 0.02);
      ctx.stroke();
    }
  },
  stripes(ctx, W, H, c) {
    ctx.fillStyle = c.deep; ctx.globalAlpha = 0.18;
    const step = H * 0.12;
    for (let x = -H; x < W + H; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + step * 0.45, 0); ctx.lineTo(x + step * 0.45 - H, H); ctx.lineTo(x - H, H); ctx.fill();
    }
  },
  confetti(ctx, W, H, c, r) {
    for (let i = 0; i < 70; i++) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = i % 2 ? c.deep : c.accent;
      ctx.translate(r() * W, r() * H); ctx.rotate(r() * Math.PI);
      const s = H * (0.015 + r() * 0.025);
      ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.8);
      ctx.restore();
    }
  },
};

function fitText(ctx, text, maxW, maxSize, weight = 800) {
  let size = maxSize;
  ctx.font = `${weight} ${size}px ${FONT}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) size = Math.floor(size * (maxW / w));
  ctx.font = `${weight} ${size}px ${FONT}`;
  return size;
}

function splitName(name) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [name.trim()];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

function barcode(ctx, x, y, w, h, ink, r) {
  ctx.fillStyle = '#fff'; ctx.globalAlpha = 1;
  roundRect(ctx, x - w * 0.08, y - h * 0.12, w * 1.16, h * 1.42, h * 0.08); ctx.fill();
  ctx.fillStyle = '#111';
  let cx = x;
  while (cx < x + w) { const bw = 2 + r() * 7; if (r() > 0.4) ctx.fillRect(cx, y, bw, h); cx += bw + 2 + r() * 4; }
  ctx.fillStyle = ink;
}

const imgs = new Map();
export function loadLabelImage(src) {
  if (!imgs.has(src)) imgs.set(src, new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  return imgs.get(src);
}

// Condensação: gotas de vários tamanhos com sombra, brilho de ponta e rastro nas maiores, mais uma névoa fria leve.
// O desenho é determinístico (semente fixa), então o mesmo tema sempre tem as mesmas gotas.
const dropLayers = new Map();
function condensation(target, W, H) {
  const key = `${W}x${H}`;
  if (!dropLayers.has(key)) {
    const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    paintCondensation(layer.getContext('2d'), W, H);
    dropLayers.set(key, layer); // as gotas são iguais em todos os temas: desenha uma vez por tamanho
  }
  target.drawImage(dropLayers.get(key), 0, 0);
}

function paintCondensation(ctx, W, H) {
  const r = rng(2026);
  ctx.save();
  const haze = ctx.createLinearGradient(0, 0, 0, H);
  haze.addColorStop(0, 'rgba(200,225,255,0.07)'); haze.addColorStop(1, 'rgba(200,225,255,0.18)');
  ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
  const drop = (x, y, rad, streak) => {
    const rx = rad, ry = rad * 1.28;
    if (streak) {
      const g = ctx.createLinearGradient(0, y - streak, 0, y);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.16)');
      ctx.fillStyle = g; ctx.fillRect(x - rx * 0.3, y - streak, rx * 0.6, streak);
    }
    const body = ctx.createRadialGradient(x - rx * 0.25, y - ry * 0.3, rx * 0.1, x, y, ry);
    body.addColorStop(0, 'rgba(255,255,255,0.10)'); body.addColorStop(0.65, 'rgba(0,0,0,0.10)'); body.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.ellipse(x + rx * 0.2, y + ry * 0.45, rx * 0.5, ry * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.ellipse(x - rx * 0.38, y - ry * 0.42, rx * 0.26, ry * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
  };
  const k = (W / 2048) * 1.8;
  const many = W > 1500; // celular (1024 px): metade das gotas
  for (let i = 0; i < (many ? 1700 : 800); i++) drop(r() * W, r() * H, (1.6 + r() * r() * 5) * k, 0);
  for (let i = 0; i < (many ? 130 : 70); i++) drop(r() * W, r() * H, (6 + r() * 7) * k, r() > 0.55 ? (30 + r() * 110) * k : 0);
  ctx.restore();
}

/** Desenha a estampa de um tema: o rótulo panorâmico (imagem 2:1) com a condensação por cima. @returns {HTMLCanvasElement} */
export function drawLabel(theme, [W, H], canvas = document.createElement('canvas')) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
  if (theme.img) {
    // A arte é um PANORAMA 2:1 que dá a volta inteira da lata (360°): ocupa o canvas todo, de ponta a ponta e de cima a baixo.
    // O centro (de frente) leva o assunto e o texto; as bordas esquerda/direita se encontram nas costas. Como a IA não garante que as duas
    // pontas casem, a faixa da direita é misturada com o início da esquerda (fusão gradual, 7% da largura): a emenda some.
    // O canvas agora cobre o corpo inteiro (curva da base + corpo + pescoço). O panorama ocupa a faixa do CORPO reto (proporção correta);
    // acima (pescoço) e abaixo (curva da base) a arte continua esticando a linha de pixels da borda, em zonas que são curvas de qualquer jeito.
    const top = Math.round(H * 0.108), bodyH = Math.round(H * 0.816);
    const iw = theme.img.naturalWidth || theme.img.width, ih = theme.img.naturalHeight || theme.img.height;
    ctx.drawImage(theme.img, 0, 0, iw, 1, 0, 0, W, top + 1);
    ctx.drawImage(theme.img, 0, ih - 1, iw, 1, 0, top + bodyH - 1, W, H - (top + bodyH) + 1);
    ctx.drawImage(theme.img, 0, top, W, bodyH);
    const s = Math.round(W * 0.07);
    const n = theme.img.naturalWidth || theme.img.width, ns = Math.round((n * s) / W);
    const strip = document.createElement('canvas'); strip.width = s; strip.height = H;
    const t = strip.getContext('2d');
    t.drawImage(theme.img, 0, 0, ns, ih, 0, top, s, bodyH); // início da esquerda
    t.globalCompositeOperation = 'destination-in';
    const g = t.createLinearGradient(0, 0, s, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    t.fillStyle = g; t.fillRect(0, 0, s, H);
    ctx.drawImage(strip, W - s, 0); // sobre o fim da direita, cada vez mais forte até a borda
  }
  condensation(ctx, W, H);
  return canvas;
}

export function canvasToBlob(canvas, type = 'image/png', q) {
  return new Promise((res) => canvas.toBlob(res, type, q));
}

// Lê a imagem enviada, já reduzida: ninguém precisa de 6000 px numa lata de 2048.
export async function readImage(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (s === 1) return bmp;
  const out = await createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * s), resizeHeight: Math.round(bmp.height * s), resizeQuality: 'high' });
  bmp.close();
  return out;
}
