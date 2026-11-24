// Temas prontos. Cada tema define a cor do fundo, a cor do texto por cima dele (contraste AA conferido),
// a estampa gerada no canvas (textures.js) e qual modelo 3D flutua em volta da lata.
export const THEMES = [
  {
    id: 'limao',
    name: 'Limão Siciliano',
    short: 'Limão',
    tagline: 'Cítrico, gelado e sem açúcar.',
    bg: '#ffd84d',
    ink: '#1d1600',
    element: 'lemon',
    label: { base: '#ffe066', deep: '#f2b705', ink: '#1d1600', accent: '#2f7d32', pattern: 'slices' },
  },
  {
    id: 'cereja',
    name: 'Cereja Noturna',
    short: 'Cereja',
    tagline: 'Doce na medida, cor de cinema.',
    bg: '#b5102b',
    ink: '#fff5f2',
    element: 'cherry',
    label: { base: '#d4143a', deep: '#7c0a1d', ink: '#fff5f2', accent: '#ffd0d8', pattern: 'dots' },
  },
  {
    id: 'mirtilo',
    name: 'Mirtilo Elétrico',
    short: 'Mirtilo',
    tagline: 'Frutas azuis e um choque de energia.',
    bg: '#3346c4',
    ink: '#f3f5ff',
    element: 'blueberry',
    label: { base: '#3f55d9', deep: '#1c2575', ink: '#f3f5ff', accent: '#9ef0ff', pattern: 'waves' },
  },
  {
    id: 'menta',
    name: 'Menta Fresca',
    short: 'Menta',
    tagline: 'Folha recém-colhida, gás fininho.',
    bg: '#86e3ad',
    ink: '#06301a',
    element: 'mint',
    label: { base: '#9cf0bf', deep: '#1f8a4c', ink: '#06301a', accent: '#ffffff', pattern: 'stripes' },
  },
];

// Tema "Sua lata": a cor e a estampa vêm do formulário do estúdio (customizer.js).
export const CUSTOM_DEFAULTS = {
  id: 'custom',
  name: 'Sua Lata',
  short: 'Sua lata',
  tagline: 'Sua arte, seu nome, sua cor.',
  element: 'star',
  text: 'Seu nome',
  color: '#ff7a59',
};

export const SWATCHES = ['#ff7a59', '#ffcf3f', '#2ec4b6', '#5b5bf0', '#111827', '#f4f1ea', '#e8508e', '#57cc6b'];

// Texto legível sobre qualquer cor: escolhe preto ou branco pela luminância relativa (WCAG).
export function inkFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#111111' : '#ffffff';
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
}

export function customTheme(state) {
  const color = state.color || CUSTOM_DEFAULTS.color;
  const ink = inkFor(color);
  return {
    ...CUSTOM_DEFAULTS,
    bg: color,
    ink,
    label: { base: color, deep: shade(color, -0.35), ink, accent: shade(color, 0.6), pattern: 'confetti' },
    custom: state,
  };
}
