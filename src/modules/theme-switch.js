// Troca de tema coreografada com GSAP: a lata gira 720° com motion blur, o nome do tema sai e volta, e a estampa troca
// no pico do giro (meio de um power2.inOut = velocidade máxima, blur máximo). O fundo é sempre o mesmo preto.
import { gsap } from 'gsap';
import { SETTINGS } from '../config/settings.js';

export function createThemeSwitcher({ can, reducedMotion }) {
  let current = null;
  let running = null;
  let pending = null;

  // primeira pintura: sem animação
  async function init(theme) {
    current = theme;
    await can.applyTheme(theme);
  }

  async function run(theme) {
    // a textura é preparada ANTES do giro começar, para a troca no pico ser instantânea
    const tex = await can.textureFor(theme);
    current = theme;

    if (reducedMotion) {
      can.setTexture(tex);
      return;
    }

    const dur = SETTINGS.spin.duration;
    const tl = gsap.timeline();
    tl.to(can.state, { spin: `+=${SETTINGS.spin.degrees}`, duration: dur, ease: 'power2.inOut' }, 0);
    tl.call(() => can.setTexture(tex), null, dur / 2);
    tl.call(() => { can.state.spin %= 360; }, null, dur + 0.01);
    await tl.then();
  }

  // pedidos que chegam no meio de uma troca ficam na fila (só o último vale)
  async function go(theme) {
    if (running) {
      pending = theme;
      return running;
    }
    running = run(theme);
    await running;
    running = null;
    if (pending) {
      const next = pending;
      pending = null;
      return go(next);
    }
  }

  return { init, go, get current() { return current; } };
}
