// A lata herói: inclina em direção ao cursor, gira na troca de tema e recebe a estampa gerada no canvas.
import { SETTINGS } from '../config/settings.js';
import { pointer, idleSway } from './pointer.js';
import { drawLabel, canvasToBlob, loadLabelImage } from './textures.js';

export function createCan(el, { src, labelSize, reducedMotion }) {
  const state = { yaw: 0, pitch: 0, roll: 0, spin: 0, drag: 0 }; // drag = giro livre do visitante (graus, sem limite)
  let dragging = false;
  let vel = 0; // inércia (graus por segundo)
  const blurNode = document.querySelector('[data-spin-blur]');
  const textures = new Map(); // id do tema -> textura do model-viewer (temas prontos ficam em cache)
  let labelMaterial = null;
  let lastOrientation = '';
  let lastSpin = 0;
  let blur = 0;
  let canvas = null;

  const loaded = new Promise((resolve) => el.addEventListener('load', resolve, { once: true }));
  el.src = src;
  loaded.then(() => {
    labelMaterial = el.model.materials.find((m) => m.name === 'Label') ?? el.model.materials[0];
  });

  // Gera (ou pega do cache) a textura de um tema. Temas do estúdio nunca vão para o cache: mudam a cada tecla.
  async function textureFor(theme) {
    await loaded;
    const cacheable = theme.id !== 'custom';
    if (cacheable && textures.has(theme.id)) return textures.get(theme.id);
    if (theme.src && !theme.img) theme.img = await loadLabelImage(theme.src);
    canvas = drawLabel(theme, labelSize, cacheable ? undefined : canvas || undefined);
    const blob = await canvasToBlob(canvas, 'image/png');
    const url = URL.createObjectURL(blob);
    const tex = await el.createTexture(url);
    URL.revokeObjectURL(url);
    if (cacheable) textures.set(theme.id, tex);
    return tex;
  }

  function setTexture(tex) {
    labelMaterial?.pbrMetallicRoughness.baseColorTexture.setTexture(tex);
  }

  async function applyTheme(theme) {
    setTexture(await textureFor(theme));
  }

  // Arrastar em qualquer ponto livre do herói gira o copo 360° (e mais), com inércia.
  function enableDrag(zone) {
    let lastX = 0, lastT = 0;
    zone.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a, input, label, .studio, .picker, .site-header')) return;
      dragging = true; lastX = e.clientX; lastT = performance.now(); vel = 0;
      zone.setPointerCapture(e.pointerId);
      zone.classList.add('is-grabbing');
    });
    zone.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const now = performance.now();
      const d = (e.clientX - lastX) * 0.45;
      state.drag += d;
      vel = 0.7 * vel + 0.3 * (d / (Math.max(1, now - lastT) / 1000));
      lastX = e.clientX; lastT = now;
    });
    const up = () => { dragging = false; zone.classList.remove('is-grabbing'); vel = Math.max(-1600, Math.min(1600, vel)); };
    zone.addEventListener('pointerup', up);
    zone.addEventListener('pointercancel', up);
  }

  function tick(dt, now) {
    if (!dragging && vel) { state.drag += vel * dt; vel *= Math.pow(0.03, dt); if (Math.abs(vel) < 2) vel = 0; }
    const src = pointer.active ? pointer : idleSway(now);
    const k = 1 - Math.pow(1 - SETTINGS.tilt.ease, dt * 60);
    state.yaw += (src.nx * SETTINGS.tilt.yaw - state.yaw) * k;
    state.pitch += (src.ny * SETTINGS.tilt.pitch - state.pitch) * k;
    state.roll += (-src.nx * SETTINGS.tilt.roll - state.roll) * k;

    const o = `${state.roll.toFixed(2)}deg ${state.pitch.toFixed(2)}deg ${(state.yaw + state.spin + state.drag).toFixed(2)}deg`;
    if (o !== lastOrientation) {
      el.orientation = o;
      lastOrientation = o;
    }

    // motion blur proporcional à velocidade angular do giro
    const speed = Math.abs(state.spin - lastSpin) / Math.max(dt, 0.001); // graus por segundo
    lastSpin = state.spin;
    const target = reducedMotion ? 0 : Math.min(16, speed / 110);
    blur += (target - blur) * 0.5;
    if (blur > 0.25) {
      blurNode.setAttribute('stdDeviation', `${blur.toFixed(1)} 0`);
      if (!el.classList.contains('is-spinning')) el.classList.add('is-spinning');
    } else if (el.classList.contains('is-spinning')) {
      el.classList.remove('is-spinning');
      blurNode.setAttribute('stdDeviation', '0 0');
    }
  }

  return { el, state, loaded, tick, enableDrag, textureFor, setTexture, applyTheme, get canvas() { return canvas; } };
}
