// Seletor de tema (radiogroup com setas). É a única interface do herói além do estúdio.
import { THEMES } from '../config/themes.js';

export function createUI() {
  const picker = document.querySelector('[data-picker]');
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

  return { setActive, onPick };
}
