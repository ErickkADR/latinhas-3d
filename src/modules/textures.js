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

/**
 * Desenha a estampa de um tema. `theme.custom` (estúdio) traz { text, image, layout }.
 * @returns {HTMLCanvasElement}
 */
export function drawLabel(theme, [W, H], canvas = document.createElement('canvas')) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const c = theme.label;
  const custom = theme.custom || null;
  const r = rng([...theme.id].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7));

  // fundo
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c.base); g.addColorStop(1, c.deep);
  ctx.fillStyle = c.base; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.35; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;

  const full = custom?.image && custom.layout === 'full';
  if (full) drawCover(ctx, custom.image, W * 0.2, 0, W * 0.6, H);
  else { ctx.save(); PATTERNS[c.pattern]?.(ctx, W, H, c, r); ctx.restore(); }

  // faixas de cima e de baixo
  const band = H * 0.075;
  ctx.globalAlpha = 1; ctx.fillStyle = c.deep;
  ctx.fillRect(0, 0, W, band); ctx.fillRect(0, H - band, W, band);
  ctx.fillStyle = c.accent; ctx.fillRect(0, band, W, H * 0.008); ctx.fillRect(0, H - band - H * 0.008, W, H * 0.008);

  const cx = W / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // marca (no alto, de frente)
  ctx.fillStyle = full ? '#fff' : c.ink;
  ctx.font = `700 ${Math.round(H * 0.06)}px ${FONT}`;
  ctx.fillText('latinha', cx, band * 0.5 + 2);

  // arte enviada no layout clássico: um selo redondo acima do nome
  let nameY = H * 0.54;
  if (custom?.image && !full) {
    const s = H * 0.34, y = H * 0.14;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, y + s / 2, s / 2, 0, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
    drawCover(ctx, custom.image, cx - s / 2, y, s, s);
    ctx.restore();
    ctx.lineWidth = H * 0.012; ctx.strokeStyle = c.ink;
    ctx.beginPath(); ctx.arc(cx, y + s / 2, s / 2, 0, Math.PI * 2); ctx.stroke();
    nameY = H * 0.68;
  }

  // nome (o protagonista)
  const name = custom ? (custom.text || '').trim() : theme.short;
  if (name) {
    const lines = splitName(name);
    const maxW = W * 0.23;
    const maxSize = H * (custom?.image && !full ? 0.17 : lines.length > 1 ? 0.2 : 0.26);
    const sizes = lines.map((l) => fitText(ctx, l.toUpperCase(), maxW, maxSize));
    const size = Math.min(...sizes);
    ctx.font = `800 ${size}px ${FONT}`;
    const lh = size * 0.92;
    const top = nameY - ((lines.length - 1) * lh) / 2;
    if (full) {
      ctx.fillStyle = c.base;
      ctx.globalAlpha = 0.92;
      roundRect(ctx, cx - W * 0.17, top - lh * 0.62, W * 0.34, lh * lines.length + lh * 0.24, H * 0.03); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = c.ink;
    lines.forEach((l, i) => ctx.fillText(l.toUpperCase(), cx, top + i * lh));
  }

  // linha de apoio
  ctx.font = `500 ${Math.round(H * 0.045)}px ${FONT}`;
  ctx.fillStyle = full ? '#fff' : c.ink;
  ctx.fillText(custom ? 'edição única · 350 ml' : `${theme.name.split(' ').slice(1).join(' ').toLowerCase() || 'clássico'} · 350 ml`, cx, H - band - H * 0.09);

  // costas: código de barras e informação (desenhado dos dois lados da emenda)
  for (const bx of [0, W]) {
    ctx.save();
    ctx.translate(bx, 0);
    ctx.fillStyle = c.ink; ctx.font = `600 ${Math.round(H * 0.032)}px ${FONT}`;
    ctx.fillText('marca fictícia · estudo 3D', 0, H * 0.3);
    ctx.fillText('latinhas-3d.vercel.app', 0, H * 0.35);
    barcode(ctx, -W * 0.05, H * 0.55, W * 0.1, H * 0.13, c.ink, rng(42));
    ctx.restore();
  }
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
