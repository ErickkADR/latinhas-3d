// Partes de interface do herói e das seções: seletor de tema (radiogroup com setas), textos do sabor e cards.
import { THEMES } from '../config/themes.js';

export function createUI({ imgBase, imgExt }) {
  const name = document.querySelector('[data-flavor-name]');
  const picker = document.querySelector('[data-picker]');
  const cards = document.querySelector('[data-cards]');

  function setTexts(theme) {
    name.textContent = theme.name;
  }

  // ---- seletor ----
  const options = THEMES.map((t) => ({ id: t.id, label: t.short }));
  picker.innerHTML = options
    .map((o, i) => `<button type="button" role="radio" class="pick" data-theme="${o.id}" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span class="pick-label">${o.label}</span></button>`)
    .join('');
  const buttons = [...picker.querySelectorAll('.pick')];

  function setActive(id) {
    for (const b of buttons) {
      const on = b.dataset.theme === id;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
  }

  function onPick(fn) {
    picker.addEventListener('click', (e) => {
      const b = e.target.closest('.pick');
      if (b) fn(b.dataset.theme, b);
    });
    picker.addEventListener('keydown', (e) => {
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const b = buttons[(i + d + buttons.length) % buttons.length];
      b.focus();
      fn(b.dataset.theme, b);
    });
  }

  // ---- cards ----
  cards.innerHTML = THEMES.map(
    (t) => `<li class="card">
      <img src="${imgBase}card-${t.id}-480.${imgExt}" srcset="${imgBase}card-${t.id}-480.${imgExt} 480w, ${imgBase}card-${t.id}-960.${imgExt} 960w" sizes="(max-width: 640px) 90vw, 300px" width="480" height="600" loading="lazy" decoding="async" alt="Lata do tema ${t.name}" />
      <div class="card-body"><h3>${t.name}</h3>
      <button class="btn btn--line" type="button" data-theme="${t.id}">Ver na lata<span class="sr-only"> ${t.name}</span></button></div>
    </li>`,
  ).join('');

  function onCard(fn) {
    cards.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-theme]');
      if (b) fn(b.dataset.theme);
    });
  }

  return { setTexts, setActive, onPick, onCard, texts: [name] };
}
