// Um único requestAnimationFrame para a página inteira. Cada módulo se inscreve com addTick(fn).
// Regra do loop: dentro de um tick só se ESCREVE no DOM (transform, atributo). Leitura de layout
// (getBoundingClientRect, offsetWidth...) fica nos observers de resize, nunca aqui.
const ticks = new Set();
let raf = 0;
let last = 0;
let paused = false;
const reasons = new Set();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  for (const fn of ticks) fn(dt, now);
  raf = requestAnimationFrame(frame);
}

export function addTick(fn) {
  ticks.add(fn);
  return () => ticks.delete(fn);
}

function sync() {
  const shouldRun = reasons.size === 0;
  if (shouldRun && !raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  } else if (!shouldRun && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  paused = !shouldRun;
}

// pausa por um motivo ("hidden", "offscreen"...); só volta quando todos os motivos saem
export function pause(reason) { reasons.add(reason); sync(); }
export function resume(reason) { reasons.delete(reason); sync(); }
export const isPaused = () => paused;

export function startLoop() {
  document.addEventListener('visibilitychange', () => (document.hidden ? pause('hidden') : resume('hidden')));
  sync();
}
