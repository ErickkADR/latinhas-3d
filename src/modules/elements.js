// Elementos 3D que flutuam em volta da lata: parallax de profundidade, campo de repulsão do ponteiro,
// implosão para dentro da lata e explosão para novas posições na troca de tema.
import { SETTINGS } from '../config/settings.js';
import { pointer, idleSway } from './pointer.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Posições "em volta" da lata, numa elipse com folga no centro. A semente muda por tema.
function layout(count, seedText, mobile) {
  const r = rng([...seedText].reduce((s, ch) => s * 33 + ch.charCodeAt(0), 11));
  const out = [];
  const offset = r() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const a = offset + (i / count) * Math.PI * 2 + (r() - 0.5) * 0.5;
    const rx = mobile ? 0.36 + r() * 0.1 : 0.2 + r() * 0.2;
    const ry = mobile ? 0.26 + r() * 0.1 : 0.26 + r() * 0.16;
    out.push({
      x: Math.cos(a) * rx,
      y: Math.sin(a) * ry,
      depth: 0.5 + r() * 0.75,
      spin: (r() - 0.5) * 40, // graus por segundo
      phase: r() * Math.PI * 2,
    });
  }
  return out;
}

export function createElements(container, { count, size, base, mobile }) {
  const state = { implode: 0 };
  const items = [];
  let model = null;
  let tint = null;
  const metrics = { w: 0, h: 0, cx: 0, cy: 0 }; // tamanho e centro do herói na viewport

  for (let i = 0; i < count; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'float';
    const mv = document.createElement('model-viewer');
    mv.setAttribute('environment-image', 'neutral');
    mv.setAttribute('tone-mapping', 'neutral');
    mv.setAttribute('interaction-prompt', 'none');
    mv.setAttribute('shadow-intensity', '0');
    mv.setAttribute('disable-tap', '');
    mv.setAttribute('disable-zoom', '');
    mv.setAttribute('camera-orbit', '0deg 75deg auto');
    mv.setAttribute('aria-hidden', 'true');
    mv.style.width = mv.style.height = `${size}px`;
    wrap.appendChild(mv);
    container.appendChild(wrap);
    items.push({ wrap, mv, home: null, ox: 0, oy: 0, rot: 0, lastO: '', visible: false });
  }

  function setLayout(seed) {
    layout(count, seed, mobile).forEach((h, i) => {
      items[i].home = h;
      items[i].wrap.style.zIndex = h.depth > 1 ? 3 : 1;
    });
  }

  function loadOne(it, url) {
    return new Promise((resolve) => {
      if (it.mv.src === url && it.mv.loaded) return resolve();
      const done = () => { applyTint(it); resolve(); };
      it.mv.addEventListener('load', done, { once: true });
      it.mv.addEventListener('error', resolve, { once: true });
      it.original = null; // a cor original é do modelo novo, não do anterior
      it.mv.src = url;
    });
  }

  function applyTint(it) {
    const mat = it.mv.model?.materials?.[0];
    if (!mat) return;
    if (!it.original) it.original = [...mat.pbrMetallicRoughness.baseColorFactor];
    mat.pbrMetallicRoughness.setBaseColorFactor(tint ?? it.original);
  }

  // troca o modelo de todos os elementos; resolve quando carregarem (ou no tempo-limite)
  function setModel(name, { timeout = 1200 } = {}) {
    model = name;
    const url = `${base}${name}.glb`;
    const all = Promise.all(items.map((it) => loadOne(it, url)));
    return Promise.race([all, new Promise((r) => setTimeout(r, timeout))]);
  }

  // carrega um elemento por vez, com intervalo: a lata e a primeira pintura não disputam rede/GPU com eles
  async function loadStaggered(name, gap) {
    model = name;
    const url = `${base}${name}.glb`;
    for (const it of items) {
      await new Promise((r) => setTimeout(r, gap));
      loadOne(it, url);
    }
  }

  function setTint(hex) {
    tint = hex;
    for (const it of items) applyTint(it);
  }

  function measure(rect) {
    metrics.w = rect.width;
    metrics.h = rect.height;
    metrics.cx = rect.left + rect.width / 2;
    metrics.cy = rect.top + rect.height / 2;
  }

  function tick(dt, now) {
    const src = pointer.active ? pointer : idleSway(now);
    const { radius, strength, ease } = SETTINGS.repel;
    const k = 1 - Math.pow(1 - ease, dt * 60);
    const spread = 1 - state.implode;

    for (const it of items) {
      if (!it.home) continue;
      const h = it.home;
      const bob = Math.sin(now * 0.0011 + h.phase) * 8;
      const px = -src.nx * SETTINGS.parallax * h.depth;
      const py = -src.ny * SETTINGS.parallax * h.depth;
      const x = (h.x * metrics.w + px) * spread;
      const y = (h.y * metrics.h + py + bob) * spread;

      // campo de repulsão (v0: pergunta ao DOM onde o elemento está)
      let tx = 0, ty = 0;
      const rect = it.wrap.getBoundingClientRect();
      if (pointer.active && spread > 0.5) {
        const dx = rect.left + rect.width / 2 - pointer.x;
        const dy = rect.top + rect.height / 2 - pointer.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < radius) {
          const f = (1 - d / radius) ** 2 * strength;
          tx = (dx / d) * f;
          ty = (dy / d) * f;
        }
      }
      it.ox += (tx - it.ox) * k;
      it.oy += (ty - it.oy) * k;

      const s = (0.5 + h.depth * 0.5) * (0.15 + 0.85 * spread);
      it.wrap.style.transform = `translate3d(${(x + it.ox).toFixed(1)}px, ${(y + it.oy).toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`;

      it.rot += h.spin * dt;
      const o = `${(src.ny * 10).toFixed(1)}deg ${(Math.sin(now * 0.0006 + h.phase) * 25).toFixed(1)}deg ${(it.rot + src.nx * 25).toFixed(1)}deg`;
      if (o !== it.lastO) {
        it.mv.orientation = o;
        it.lastO = o;
      }
    }
  }

  return { state, items, setLayout, setModel, loadStaggered, setTint, measure, tick, get model() { return model; } };
}
