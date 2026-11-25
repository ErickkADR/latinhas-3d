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
import { createThemeSwitcher } from './modules/theme-switch.js';

const idle = (fn, timeout = 1500) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 200));

export async function startScene({ ui, initial }) {
  patchModelViewer();
  initPointer();
  const device = deviceClass();
  const reducedMotion = prefersReducedMotion();
  const hero = document.querySelector('[data-hero]');
  const shot = document.body.classList.toggle('is-shot', new URLSearchParams(location.search).has('shot'));
  if (shot) Object.assign(pointer, { active: true, nx: 0.12, ny: -0.1, x: -9999, y: -9999 });

  document.querySelector('[data-can]').setAttribute('camera-orbit', `0deg 84deg ${window.innerWidth <= 860 ? '0.42m' : '0.4m'}`);
  const can = createCan(document.querySelector('[data-can]'), {
    src: `${MODELS_BASE}can.glb`,
    labelSize: device === 'mobile' ? SETTINGS.label.mobile : SETTINGS.label.desktop,
    reducedMotion,
  });
  can.enableDrag(hero);
  const switcher = createThemeSwitcher({ can, reducedMotion });

  // herói fora da tela = loop parado (nada de renderizar 3D que ninguém vê)
  new IntersectionObserver(([e]) => (e.isIntersecting ? resume('offscreen') : pause('offscreen'))).observe(hero);

  addTick((dt, now) => {
    can.tick(dt, now);
  });

  const byId = (id) => THEMES.find((t) => t.id === id) ?? THEMES[0];
  const first = byId(initial);
  ui.setActive(first.id);

  await fontsReady();
  await switcher.init(first);
  can.el.dismissPoster();
  startLoop();

  // no ocioso: as estampas dos outros temas, para a troca no pico do giro ser instantânea
  idle(() => THEMES.filter((t) => t !== first).forEach((t, i) => setTimeout(() => can.textureFor(t), 4000 + 1500 * i)));

  return {
    handle(action) {
      if (action.type === 'theme') switcher.go(byId(action.id));
    },
  };
}
