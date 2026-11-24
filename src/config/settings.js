// Números que ajustam o comportamento. Tudo que é "quanto" mora aqui; os módulos só têm o "como".
export const MODELS_BASE = '/models/';

export const BREAKPOINTS = { mobile: 640, tablet: 1024 };

export const SETTINGS = {
  // quantos elementos 3D flutuam em volta da lata, por tamanho de tela
  elements: { desktop: 9, tablet: 7, mobile: 4 },
  // tamanho máximo (px) do <model-viewer> de cada elemento; a profundidade escala para baixo
  elementSize: { desktop: 170, tablet: 140, mobile: 104 },
  // inclinação da lata em direção ao cursor (graus) e suavização (0..1 por frame a 60 fps)
  tilt: { yaw: 32, pitch: 14, roll: 7, ease: 0.085 },
  // parallax de profundidade: px de deslocamento por unidade de profundidade
  parallax: 46,
  // campo de repulsão em volta do ponteiro
  repel: { radius: 230, strength: 120, ease: 0.14 },
  // troca de tema
  spin: { degrees: 720, duration: 1.5 },
  // carregamento escalonado dos elementos (ms entre um e outro, depois que a lata carregou)
  stagger: 160,
  // resolução da estampa gerada no canvas
  label: { desktop: [2048, 1024], mobile: [1024, 512] },
  // bolhas de gás
  bubbles: { desktop: 36, mobile: 14 },
};

export function deviceClass(width = window.innerWidth) {
  if (width <= BREAKPOINTS.mobile) return 'mobile';
  if (width <= BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
