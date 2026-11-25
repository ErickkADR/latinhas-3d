# latinhas-3d — CLAUDE.md

Landing 3D de latinhas (marca fictícia "Latinha"). Projeto **pessoal** do Erick, conta pessoal em tudo:
GitHub `ErickkADR/latinhas-3d`, Vercel (conta `erickkadr`), produção https://latinhas-3d.vercel.app.
Estudo de portfólio: o README é a vitrine (decisões + números antes/depois). Ler o README antes de mexer.

## Stack e comandos
- Vite + JavaScript puro, sem framework. `@google/model-viewer` 4.4 (three 0.183, **pinado em ~0.183**: é o peer do model-viewer), GSAP.
- `npm run dev` / `npm run build` / `npm run preview` (4173).
- Publicar: `npx vercel --prod` na pasta (o projeto Vercel não está ligado ao GitHub; push não publica).
- Prints e medições usam o **Chrome instalado** (`channel: 'chrome'` no Playwright), não o Chromium do Playwright (não baixado nesta máquina).

## Assets: o que é versionado e o que é gerado
- `public/models/*.glb` (otimizados) e `public/img/*` são versionados. Os crus (`assets-src/models-raw`, `assets-src/img-raw`) **não**:
  regenerar com `npm run models:raw` e `npm run images:capture` (dev rodando na 5173).
- Mudou o gerador (`scripts/generate-models.mjs`)? Rodar `models:raw` + `models:optimize`. Mudou visual dos temas? `images:capture` + `images:optimize`.
- `reports/*.md` são os números do README; os `.json` do Lighthouse ficam fora do git.

## Decisões deliberadas (parecem erro, não são)
- `public/decoders/meshopt-ready.js` é um arquivo **vazio de propósito**: o model-viewer só ativa o Meshopt (que já vem no bundle) quando
  `meshoptDecoderLocation` aponta para um script. Sem ele, os .glb otimizados não carregam.
- `src/modules/mv-patch.js` contorna bug do model-viewer 4.4.0 (`orientation` quebra o ARRenderer fora de AR). Ao atualizar o
  model-viewer, testar sem o patch; se o erro sumiu, remover.
- A textura embutida na lata é 256 px porque nunca aparece: `reveal="manual"` só revela depois da estampa do canvas.
- O loop (`loop.js`) **não pode ler o DOM**. Medidas vêm do ResizeObserver/scroll em `scene.js`. Ler `getBoundingClientRect` no tick
  foi exatamente o que a v0 fazia (8 recálculos de estilo forçados por frame).
- Cada mudança de `orientation` faz o model-viewer percorrer todos os vértices (caixa envolvente): modelo novo tem que passar pelo
  pipeline, malha crua derruba o FPS mesmo depois de baixada.
- `scene.js` é importado depois do `load` de propósito (TBT/LCP). Cliques antes disso ficam numa fila em `main.js`.
- Nenhuma marca real de bebida em nada (texto, estampa, modelo).

## Armadilhas
- Geometria extrudada do three (ExtrudeGeometry) sai sem índice: sem o passo `reindexCreased` do pipeline ela não simplifica.
- Peças torneadas (LatheGeometry) têm a costura em +Z, de frente para a câmera: o gerador gira 180°.
- Escrever só `transform` não invalida layout no Chrome; a métrica certa para o "reflow" do loop é `RecalcStyleCount`.
- `ScriptDuration` do CDP não mostra o custo do model-viewer; usar `npm run measure:profile`.

## v2 (24/11/2026, pedido do Erick)
- Fundo **sempre o mesmo preto** (`--bg: #0a0a0b`), igual ao `copos-laser`, sem troca de cor por tema. Sem elementos 3D flutuantes, sem bolhas, sem estúdio
  "Sua lata": a única opção é a arte (o tema). Os módulos `elements.js`, `bubbles.js`, `customizer.js` e os modelos de fruta/estrela foram removidos (histórico do git tem tudo).
- O README e as seções acima deste bloco que falam de elementos, bolhas, estúdio e `bg` por tema descrevem a v0/v1.
- Hero com `height: 100vh` exato (sem altura mínima). Nenhuma marca real de bebida em nada.


## v3 (25/11/2026, pedido do Erick)
- **Só o herói**: sem seções, menu, rodapé nem cards. A página não rola. **Giro livre de 360°** (`can.enableDrag(hero)`, inércia; `state.drag` é aditivo ao tilt e ao giro do GSAP).
- **Canvas da lata = herói inteiro** (nada é cortado). O `<model-viewer>` precisa de `max-camera-orbit="auto auto 2m"` para a distância da câmera valer (0,4 m desktop, 0,42 m celular).
- **Fundo em CSS** (`hero.css`: degradê + brilho de chão + `public/img/noise.png`). A imagem de parede que o Erick mandou ficou pixelada e foi descartada. Mesmo CSS do `copos-laser`.
