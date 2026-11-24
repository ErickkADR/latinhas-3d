// Tudo que é 3D e animação. Carregado sob demanda pelo main.js, depois da primeira pintura.
// Ordem de carregamento: lata (com a estampa já aplicada) -> elementos um a um -> modelos e estampas dos outros temas no ocioso.
self.ModelViewerElement = { ...(self.ModelViewerElement || {}), meshoptDecoderLocation: '/decoders/meshopt-ready.js' };
await import('@google/model-viewer');

import { THEMES } from './config/themes.js';
import { SETTINGS, MODELS_BASE, deviceClass, prefersReducedMotion } from './config/settings.js';
import { patchModelViewer } from './modules/mv-patch.js';
import { addTick, startLoop, pause, resume } from './modules/loop.js';
import { initPointer, pointer } from './modules/pointer.js';
import { fontsReady } from './modules/textures.js';
import { createCan } from './modules/can.js';
import { createElements } from './modules/elements.js';
import { createThemeSwitcher } from './modules/theme-switch.js';
import { createBubbles } from './modules/bubbles.js';
import { initCustomizer } from './modules/customizer.js';

const idle = (fn, timeout = 1500) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 200));

export async function startScene({ ui, initial }) {
  patchModelViewer();
  initPointer();
  const device = deviceClass();
  const reducedMotion = prefersReducedMotion();
  const hero = document.querySelector('[data-hero]');
  const shot = document.body.classList.toggle('is-shot', new URLSearchParams(location.search).has('shot'));
  if (shot) Object.assign(pointer, { active: true, nx: 0.12, ny: -0.1, x: -9999, y: -9999 });

  const can = createCan(document.querySelector('[data-can]'), {
    src: `${MODELS_BASE}can.glb`,
    labelSize: device === 'mobile' ? SETTINGS.label.mobile : SETTINGS.label.desktop,
    reducedMotion,
  });
  const elements = createElements(document.querySelector('[data-floats]'), {
    count: SETTINGS.elements[device],
    size: SETTINGS.elementSize[device],
    base: MODELS_BASE,
    mobile: device === 'mobile',
  });
  const bubbles = createBubbles(document.querySelector('[data-bubbles]'), { count: reducedMotion ? 0 : SETTINGS.bubbles[device === 'desktop' ? 'desktop' : 'mobile'] });
  const switcher = createThemeSwitcher({ can, elements, ui, reducedMotion });
  const customizer = initCustomizer({ switcher, can, elements, onSelectCustom: () => ui.setActive('custom') });

  // ---- medidas: lidas só quando o tamanho muda (ResizeObserver) ou no scroll, nunca no loop ----
  const box = { width: 0, height: 0, left: 0, docTop: 0 };
  const originY = () => (device === 'mobile' || window.innerWidth <= 860 ? 0.58 : 0.52);
  const push = () => elements.measure({ ...box, top: box.docTop - window.scrollY, originY: originY() });
  new ResizeObserver(() => {
    const r = hero.getBoundingClientRect();
    Object.assign(box, { width: r.width, height: r.height, left: r.left, docTop: r.top + window.scrollY });
    bubbles.resize(r.width, r.height);
    push();
  }).observe(hero);
  window.addEventListener('scroll', push, { passive: true });

  // herói fora da tela = loop parado (nada de renderizar 3D que ninguém vê)
  new IntersectionObserver(([e]) => (e.isIntersecting ? resume('offscreen') : pause('offscreen'))).observe(hero);

  addTick((dt, now) => {
    bubbles.tick(dt, now);
    can.tick(dt, now);
    elements.tick(dt, now);
  });

  const byId = (id) => THEMES.find((t) => t.id === id) ?? THEMES[0];
  const first = byId(initial);
  ui.setActive(first.id);

  await fontsReady();
  await switcher.init(first);
  can.el.dismissPoster();
  startLoop();

  // carregamento escalonado: elementos um por vez, depois o resto no ocioso
  idle(async () => {
    await elements.loadStaggered(first.element, shot ? 0 : SETTINGS.stagger);
    idle(() => {
      const others = [...new Set(THEMES.map((t) => t.element).concat('star'))].filter((m) => m !== first.element);
      for (const m of others) fetch(`${MODELS_BASE}${m}.glb`, { priority: 'low' }).catch(() => {});
      THEMES.filter((t) => t !== first).forEach((t, i) => setTimeout(() => can.textureFor(t), 400 * (i + 1)));
    });
  });

  return {
    handle(action) {
      if (action.type === 'theme') switcher.go(byId(action.id));
      if (action.type === 'studio') customizer.open(action.trigger);
    },
  };
}
