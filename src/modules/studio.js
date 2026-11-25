// Estúdio "Sua arte": o visitante envia a imagem (SVG/PNG/JPG/WebP), escolhe como ela cobre a volta (repetir, esticar nos 360° ou uma vez), ajusta
// tamanho, posição e giro, escolhe a cor de fundo e baixa o rótulo planificado para imprimir. Cada mudança redesenha a lata na hora.
import { CUSTOM_THEME } from '../config/themes.js';
import { readUpload, drawLabel, canvasToBlob } from './textures.js';
import { withDpi } from './png-dpi.js';

const LABEL_MM = { w: 207, h: 136 };
const MAX_UPLOAD = 12 * 1024 * 1024;

export function initStudio({ switcher, can, onSelectCustom }) {
  const panel = document.querySelector('[data-studio]');
  const form = panel.querySelector('[data-studio-form]');
  const fileInput = form.querySelector('[data-field-file]');
  const tools = form.querySelector('[data-upload-tools]');
  const hint = form.querySelector('[data-upload-hint]');
  const strip = form.querySelector('[data-strip]');
  const dl = form.querySelector('[data-download-label]');
  const dlHint = form.querySelector('[data-download-hint]');
  const HINT = 'SVG, PNG, JPG ou WebP. Fica no seu navegador, nada é enviado.';
  const state = { up: null, mode: 'repeat', scale: 1, offY: 0, shift: 0, bg: '#111111' };
  let opener = null, live = 0;

  const isCustom = () => switcher.current?.id === 'custom';
  const theme = () => ({ ...CUSTOM_THEME, custom: { source: state.up?.source ?? null, mode: state.mode, scale: state.scale, offY: state.offY, shift: state.shift, bg: state.bg } });

  // faixa planificada: a volta inteira da lata, de uma ponta à outra
  function drawStrip() {
    if (!state.up) return;
    const x = strip.getContext('2d');
    const t = drawLabel(theme(), [600, 393], undefined, { drops: false });
    strip.height = 393; x.drawImage(t, 0, 0);
    x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(0, 0, 2, 393); x.fillRect(598, 0, 2, 393); // emenda (costas da lata)
  }

  function refresh() {
    drawStrip();
    if (!isCustom()) return;
    cancelAnimationFrame(live);
    live = requestAnimationFrame(async () => can.setTexture(await can.textureFor(theme())));
  }

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'mode') state.mode = t.value;
    if (t.name === 'scale') { state.scale = t.value / 100; form.querySelector('[data-out=scale]').textContent = t.value; }
    if (t.name === 'offY') { state.offY = t.value / 100; form.querySelector('[data-out=offY]').textContent = t.value; }
    if (t.name === 'shift') { state.shift = t.value / 360; form.querySelector('[data-out=shift]').textContent = t.value; }
    if (t.name === 'bg') state.bg = t.value;
    if (['mode', 'scale', 'offY', 'shift', 'bg'].includes(t.name)) refresh();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD) { hint.textContent = 'Arquivo grande demais (máximo 12 MB).'; return; }
    try {
      state.up = await readUpload(file);
      state.bg = state.up.bg; form.querySelector('[name=bg]').value = state.bg;
      tools.hidden = false; dl.disabled = false;
      hint.textContent = `${file.name} aplicada. Ajuste abaixo.`;
      drawStrip();
      if (isCustom()) refresh();
      else { switcher.go(theme()); onSelectCustom?.(); }
    } catch { hint.textContent = 'Não consegui abrir esse arquivo. Tente outro.'; }
  });

  form.querySelector('[data-clear-upload]').addEventListener('click', () => {
    state.up = null; fileInput.value = ''; tools.hidden = true; dl.disabled = true; hint.textContent = HINT;
  });

  dl.addEventListener('click', async () => {
    if (!state.up) return;
    dl.disabled = true; dlHint.textContent = 'Preparando o arquivo…';
    try {
      const canvas = drawLabel(theme(), [4096, 2688], undefined, { drops: false });
      const blob = await withDpi(await canvasToBlob(canvas, 'image/png'), 500);
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `rotulo-lata-${LABEL_MM.w}x${LABEL_MM.h}mm-500dpi.png` });
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      dlHint.textContent = `4096 × 2688 px, ${LABEL_MM.w} × ${LABEL_MM.h} mm a ~500 dpi, sem as gotas.`;
    } catch { dlHint.textContent = 'Não consegui gerar o arquivo. Tente de novo.'; }
    finally { dl.disabled = false; }
  });

  function open(trigger) {
    opener = trigger ?? document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    document.body.classList.add('studio-open');
    if (state.up && !isCustom()) { switcher.go(theme()); onSelectCustom?.(); }
    setTimeout(() => form.querySelector('.upload-btn')?.focus?.({ preventScroll: true }), 50);
  }
  function close() {
    panel.classList.remove('is-open'); document.body.classList.remove('studio-open');
    setTimeout(() => (panel.hidden = true), 280);
    opener?.focus?.({ preventScroll: true });
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-studio]');
    if (t) open(t);
    if (e.target.closest('[data-close-studio]')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
  return { open, close };
}
