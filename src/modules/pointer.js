// Posição do ponteiro. O listener só guarda números; quem consome lê no tick do loop.
// Sem ponteiro fino (celular), o "cursor" passeia sozinho numa curva lenta e o toque assume enquanto o dedo está na tela.
export const pointer = {
  x: window.innerWidth / 2, // px, coordenadas da viewport
  y: window.innerHeight / 2,
  nx: 0, // -1..1 em relação ao centro da viewport
  ny: 0,
  active: false, // ponteiro dentro da janela (mouse) ou dedo na tela
  fine: window.matchMedia('(pointer: fine)').matches,
};

let vw = window.innerWidth;
let vh = window.innerHeight;
let idleTimer = 0;

function set(x, y) {
  pointer.x = x;
  pointer.y = y;
  pointer.nx = (x / vw) * 2 - 1;
  pointer.ny = (y / vh) * 2 - 1;
  pointer.active = true;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => (pointer.active = false), pointer.fine ? 4000 : 900);
}

export function initPointer() {
  window.addEventListener('pointermove', (e) => set(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', (e) => set(e.clientX, e.clientY), { passive: true });
  document.documentElement.addEventListener('pointerleave', () => (pointer.active = false));
  window.addEventListener('resize', () => { vw = window.innerWidth; vh = window.innerHeight; }, { passive: true });
}

// quando ninguém mexe, um passeio suave mantém a cena viva
export function idleSway(t) {
  return { nx: Math.sin(t * 0.00045) * 0.55, ny: Math.sin(t * 0.0007 + 1.3) * 0.3 };
}
