// Números que ajustam o comportamento. Tudo que é "quanto" mora aqui; os módulos só têm o "como".
export const MODELS_BASE = '/models/';

export const BREAKPOINTS = { mobile: 640, tablet: 1024 };

export const SETTINGS = {
  // inclinação da lata em direção ao cursor (graus) e suavização (0..1 por frame a 60 fps)
  tilt: { yaw: 32, pitch: 14, roll: 7, ease: 0.085 },
  // troca de tema
  spin: { degrees: 720, duration: 1.5 },
  // resolução da estampa gerada no canvas
  label: { desktop: [2048, 1024], mobile: [1024, 512] },
};

export function deviceClass(width = window.innerWidth) {
  if (width <= BREAKPOINTS.mobile) return 'mobile';
  if (width <= BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
