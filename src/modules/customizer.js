// Estúdio "Sua lata": nome, cor, arte enviada e layout. Enquanto o tema atual é o personalizado,
// cada mudança redesenha a estampa e aplica na lata na hora (sem giro). "Girar a lata" roda a coreografia.
import { CUSTOM_DEFAULTS, SWATCHES, customTheme } from '../config/themes.js';
import { drawLabel, readImage, canvasToBlob } from './textures.js';

export function initCustomizer({ switcher, can, elements, onSelectCustom }) {
  const panel = document.querySelector('[data-studio]');
  const form = panel.querySelector('[data-studio-form]');
  const textInput = form.querySelector('[data-field-text]');
  const fileInput = form.querySelector('[data-field-image]');
  const clearBtn = form.querySelector('[data-clear-image]');
  const hint = form.querySelector('[data-image-hint]');
  const swatchBox = form.querySelector('[data-swatches]');
  const state = { text: CUSTOM_DEFAULTS.text, color: CUSTOM_DEFAULTS.color, image: null, layout: 'classic' };
  let opener = null;
  let live = 0;

  // amostras de cor + seletor livre
  swatchBox.innerHTML =
    SWATCHES.map((c, i) => `<label class="swatch" style="--c:${c}"><input type="radio" name="color" value="${c}" ${i === 0 ? 'checked' : ''}/><span class="sr-only">Cor ${c}</span></label>`).join('') +
    `<label class="swatch swatch--any"><input type="color" name="colorAny" value="${state.color}" aria-label="Escolher outra cor"/></label>`;

  const isCustom = () => switcher.current?.id === 'custom';

  function refresh() {
    if (!isCustom()) return;
    cancelAnimationFrame(live);
    live = requestAnimationFrame(async () => {
      const theme = customTheme({ ...state });
      switcher.paintColors(theme);
      elements.setTint(theme.bg);
      can.setTexture(await can.textureFor(theme));
    });
  }

  form.addEventListener('input', async (e) => {
    const t = e.target;
    if (t.name === 'text') state.text = t.value;
    if (t.name === 'color') state.color = t.value;
    if (t.name === 'colorAny') {
      state.color = t.value;
      form.querySelectorAll('input[name="color"]').forEach((r) => (r.checked = false));
    }
    if (t.name === 'layout') state.layout = t.value;
    refresh();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { hint.textContent = 'Use um arquivo PNG, JPG ou WebP.'; return; }
    try {
      state.image?.close?.();
      state.image = await readImage(file);
      hint.textContent = `${file.name} aplicada. A imagem não sai do seu navegador.`;
      clearBtn.hidden = false;
      refresh();
    } catch {
      hint.textContent = 'Não consegui abrir essa imagem. Tente outro arquivo.';
    }
  });

  clearBtn.addEventListener('click', () => {
    state.image?.close?.();
    state.image = null;
    fileInput.value = '';
    clearBtn.hidden = true;
    hint.textContent = 'PNG, JPG ou WebP. A imagem não sai do seu navegador.';
    refresh();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    switcher.go(customTheme({ ...state }));
    onSelectCustom?.();
  });

  form.querySelector('[data-download-label]').addEventListener('click', async () => {
    const theme = isCustom() ? customTheme({ ...state }) : switcher.current;
    const blob = await canvasToBlob(drawLabel(theme, [4096, 2048]), 'image/png');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `latinha-${theme.id}.png` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  function open(trigger) {
    opener = trigger ?? document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    document.body.classList.add('studio-open');
    if (!isCustom()) {
      switcher.go(customTheme({ ...state }));
      onSelectCustom?.();
    }
    document.getElementById('topo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => textInput.focus({ preventScroll: true }), 50);
  }

  function close() {
    panel.classList.remove('is-open');
    document.body.classList.remove('studio-open');
    setTimeout(() => (panel.hidden = true), 280);
    opener?.focus?.({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-studio]');
    if (t) open(t);
    if (e.target.closest('[data-close-studio]')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

  return { open, close, get state() { return state; } };
}
