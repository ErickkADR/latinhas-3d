// Seletor de tema (radiogroup com setas). É a única interface do herói além do estúdio.
import { THEMES } from '../config/themes.js';

export function createUI() {
  const picker = document.querySelector('[data-picker]');
  const options = [...THEMES.map((t) => ({ id: t.id, label: t.name, thumb: `/img/thumb/${t.id}.webp` })), { id: 'custom', label: 'Sua arte', thumb: null }];
  // grade de quadrados com a miniatura de cada tema (nome só para leitor de tela e dica)
  picker.innerHTML = options
    .map((o, i) => `<button type="button" role="radio" class="pick${o.thumb ? '' : ' pick--upload'}" data-theme="${o.id}" aria-checked="${i === 0}" aria-label="${o.label}" title="${o.label}" tabindex="${i === 0 ? 0 : -1}">${o.thumb ? `<img src="${o.thumb}" width="72" height="72" alt="" decoding="async" draggable="false" />` : '<span aria-hidden="true">+</span>'}</button>`)
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
      const d = { ArrowRight: 1, ArrowDown: 2, ArrowLeft: -1, ArrowUp: -2 }[e.key];
      if (!d) return;
      e.preventDefault();
      const b = buttons[Math.min(buttons.length - 1, Math.max(0, i + d))];
      b.focus();
      fn(b.dataset.theme, b);
    });
  }

  return { setActive, onPick };
}
