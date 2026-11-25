// Entrada leve: estilos e seletor. Pinta a página sem esperar o 3D.
// O 3D (model-viewer + three + GSAP) vem num chunk separado, importado depois da primeira pintura.
import './styles/index.css';
import { THEMES } from './config/themes.js';
import { createUI } from './modules/ui.js';

const ui = createUI();

// Enquanto o 3D não chegou, cliques ficam guardados e são repassados quando a cena estiver pronta.
const early = [];
let scene = null;
const send = (action) => (scene ? scene.handle(action) : early.push(action));

ui.onPick((id, btn) => {
  if (id === 'custom') return send({ type: 'studio', trigger: btn }); // "Sua arte" abre o estúdio; só vira ativo depois do envio
  ui.setActive(id);
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
