// Menu próprio do celular: botão com aria-expanded, foco preso dentro do painel, Esc fecha, links fecham.
export function initMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const panel = document.querySelector('[data-menu]');
  const label = toggle.querySelector('.sr-only');
  if (!toggle || !panel) return;

  const focusables = () => [...panel.querySelectorAll('a, button')];

  function open() {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
    label.textContent = 'Fechar menu';
    document.body.classList.add('menu-open');
    focusables()[0]?.focus();
  }

  function close({ focus = true } = {}) {
    if (panel.hidden) return;
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    label.textContent = 'Abrir menu';
    document.body.classList.remove('menu-open');
    setTimeout(() => (panel.hidden = true), 260);
    if (focus) toggle.focus();
  }

  toggle.addEventListener('click', () => (panel.hidden ? open() : close()));
  panel.addEventListener('click', (e) => { if (e.target.closest('[data-menu-link]')) close({ focus: false }); });
  document.addEventListener('keydown', (e) => {
    if (panel.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = [toggle, ...focusables()];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => e.matches && close({ focus: false }));
}
