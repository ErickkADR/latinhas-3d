// Entrada leve: estilos, menu, seletor, cards e textos. Pinta a página sem esperar o 3D.
// O 3D (model-viewer + three + GSAP) vem num chunk separado, importado depois da primeira pintura.
import './styles/index.css';
import { THEMES } from './config/themes.js';
import { initMenu } from './modules/menu.js';
import { createUI } from './modules/ui.js';

const ui = createUI({ imgBase: '/img/', imgExt: 'webp' });
initMenu();

// Enquanto o 3D não chegou, cliques ficam guardados e são repassados quando a cena estiver pronta.
const early = [];
let scene = null;
const send = (action) => (scene ? scene.handle(action) : early.push(action));

ui.onPick((id, btn) => {
  ui.setActive(id);
  send(id === 'custom' ? { type: 'studio', trigger: btn } : { type: 'theme', id });
});
ui.onCard((id) => {
  ui.setActive(id);
  document.getElementById('topo').scrollIntoView({ behavior: 'smooth' });
  send({ type: 'theme', id });
});
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-open-studio]');
  if (t && !scene) early.push({ type: 'studio', trigger: t });
});

function boot() {
  import('./scene.js').then(async (mod) => {
    scene = await mod.startScene({ ui, initial: new URLSearchParams(location.search).get('shot') ?? THEMES[0].id });
    for (const a of early.splice(0)) scene.handle(a);
  });
}

// depois do primeiro frame pintado, sem disputar com ele
if (document.readyState === 'complete') requestAnimationFrame(() => setTimeout(boot, 0));
else window.addEventListener('load', () => requestAnimationFrame(() => setTimeout(boot, 0)), { once: true });
