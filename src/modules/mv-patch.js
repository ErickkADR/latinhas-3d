// Contorno para um bug do @google/model-viewer 4.4.0: mudar `orientation`/`scale` chama
// arRenderer.onUpdateScene() mesmo fora de uma sessão de AR; sem cena apresentada, ele quebra em
// `this.presentedScene.add(...)` a cada frame. Aqui o método só roda quando há AR de verdade.
import { Renderer } from '@google/model-viewer/lib/three-components/Renderer.js';

export function patchModelViewer() {
  const ar = Renderer.singleton.arRenderer;
  if (!ar || ar.__latinhaPatched) return;
  const original = ar.onUpdateScene;
  ar.onUpdateScene = () => { if (ar.presentedScene) original(); };
  ar.__latinhaPatched = true;
}
