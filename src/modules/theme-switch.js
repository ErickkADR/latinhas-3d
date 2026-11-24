// Troca de tema coreografada com GSAP:
//   fundo novo abre em círculo a partir da lata -> lata gira 720° com motion blur -> estampa troca no pico do giro
//   elementos implodem para dentro da lata -> trocam de modelo -> explodem para novas posições.
import { gsap } from 'gsap';
import { SETTINGS } from '../config/settings.js';

export function createThemeSwitcher({ can, elements, ui, reducedMotion }) {
  let current = null;
  let running = null;
  let pending = null;

  function paintColors(theme) {
    const root = document.documentElement.style;
    root.setProperty('--bg', theme.bg);
    root.setProperty('--ink', theme.ink);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
  }

  // primeira pintura: sem animação
  async function init(theme) {
    current = theme;
    paintColors(theme);
    ui.setTexts(theme);
    elements.setLayout(theme.id);
    if (theme.custom) elements.setTint(theme.bg);
    await can.applyTheme(theme);
  }

  async function run(theme) {
    // a textura é preparada ANTES do giro começar, para a troca no pico ser instantânea
    const tex = await can.textureFor(theme);
    const sameElement = current?.element === theme.element;
    current = theme;

    if (reducedMotion) {
      paintColors(theme);
      ui.setTexts(theme);
      can.setTexture(tex);
      elements.setTint(theme.custom ? theme.bg : null);
      if (!sameElement) await elements.setModel(theme.element);
      return;
    }

    const { reveal } = ui;
    const dur = SETTINGS.spin.duration;
    const tl = gsap.timeline();

    // 1) fundo: círculo da cor nova nasce atrás da lata e cobre o herói
    gsap.set(reveal, { backgroundColor: theme.bg, clipPath: 'circle(0% at 50% 52%)', opacity: 1 });
    tl.to(reveal, { clipPath: 'circle(150% at 50% 52%)', duration: 0.95, ease: 'power3.inOut' }, 0);
    tl.call(() => paintColors(theme), null, 0.55);
    tl.set(reveal, { opacity: 0 }, 0.96);

    // 2) textos saem e voltam
    tl.to(ui.texts, { yPercent: -40, opacity: 0, duration: 0.3, ease: 'power2.in', stagger: 0.04 }, 0);
    tl.call(() => ui.setTexts(theme), null, 0.36);
    tl.fromTo(ui.texts, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.05 }, 0.4);

    // 3) giro de 720° com troca da estampa no pico (meio de um power2.inOut = velocidade máxima, blur máximo)
    tl.to(can.state, { spin: `+=${SETTINGS.spin.degrees}`, duration: dur, ease: 'power2.inOut' }, 0);
    tl.call(() => can.setTexture(tex), null, dur / 2);
    tl.call(() => { can.state.spin %= 360; }, null, dur + 0.01);

    // 4) elementos: implodem, trocam de modelo, explodem em posições novas
    const implode = gsap.to(elements.state, { implode: 1, duration: 0.55, ease: 'back.in(1.8)' });
    tl.add(implode, 0);
    await implode.then();
    elements.setTint(theme.custom ? theme.bg : null);
    if (!sameElement) await elements.setModel(theme.element);
    elements.setLayout(theme.id + (theme.custom ? Date.now() : ''));
    await gsap.to(elements.state, { implode: 0, duration: 1.1, ease: 'expo.out' }).then();
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

  return { init, go, paintColors, get current() { return current; } };
}
