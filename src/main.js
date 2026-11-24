// v0: primeira versão funcional, montada do jeito direto, sem otimização. Serve de linha de base para medir.
import '@google/model-viewer';
import './styles/index.css';
import { patchModelViewer } from './modules/mv-patch.js';
import { THEMES, customTheme } from './config/themes.js';
import { SETTINGS, deviceClass, prefersReducedMotion } from './config/settings.js';
import { addTick, startLoop } from './modules/loop.js';
import { initPointer, pointer } from './modules/pointer.js';
import { fontsReady } from './modules/textures.js';
import { createCan } from './modules/can.js';
import { createElements } from './modules/elements.js';
import { createThemeSwitcher } from './modules/theme-switch.js';
import { createBubbles } from './modules/bubbles.js';
import { initMenu } from './modules/menu.js';
import { initCustomizer } from './modules/customizer.js';
import { createUI } from './modules/ui.js';

const MODELS = '/models-raw/';
patchModelViewer();
const device = deviceClass();
const reducedMotion = prefersReducedMotion();
const hero = document.querySelector('[data-hero]');
const floats = document.querySelector('[data-floats]');

const ui = createUI({ imgBase: '/img-raw/', imgExt: 'png' });
initMenu();
initPointer();

const can = createCan(document.querySelector('[data-can]'), { src: `${MODELS}can.glb`, labelSize: SETTINGS.label.desktop, reducedMotion });
const elements = createElements(floats, { count: SETTINGS.elements.desktop, size: SETTINGS.elementSize.desktop, base: MODELS, mobile: device === 'mobile' });
const bubbles = createBubbles(document.querySelector('[data-bubbles]'), { count: SETTINGS.bubbles.desktop });
const switcher = createThemeSwitcher({ can, elements, ui, reducedMotion });

const byId = (id) => THEMES.find((t) => t.id === id);
const customizer = initCustomizer({ switcher, can, elements, onSelectCustom: () => ui.setActive('custom') });

ui.onPick((id, btn) => {
  ui.setActive(id);
  if (id === 'custom') return customizer.open(btn);
  switcher.go(byId(id));
});
ui.onCard((id) => {
  ui.setActive(id);
  hero.scrollIntoView({ behavior: 'smooth' });
  switcher.go(byId(id));
});

let bw = 0, bh = 0;
addTick((dt, now) => {
  const r = hero.getBoundingClientRect();
  elements.measure(r);
  if (r.width !== bw || r.height !== bh) { bw = r.width; bh = r.height; bubbles.resize(bw, bh); }
  bubbles.tick(dt, now);
  can.tick(dt, now);
  elements.tick(dt, now);
});

// ?shot=<tema>: modo de captura usado por scripts/capture-cards.mjs (só a lata e os elementos, pose fixa)
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  document.body.classList.add('is-shot');
  Object.assign(pointer, { active: true, nx: 0.12, ny: -0.1, x: -9999, y: -9999 });
}

(async () => {
  await fontsReady();
  await switcher.init(byId(shot) ?? THEMES[0]);
  can.el.dismissPoster();
  elements.setModel(switcher.current.element);
  startLoop();
})();

window.__latinha = { switcher, customTheme, THEMES };
