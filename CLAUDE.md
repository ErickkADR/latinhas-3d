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

## Temas novos (25/11/2026, pedido do Erick)
- 4 temas com **rótulos gerados no Magnific** (`assets-src/rotulos/*.png`, versionados; `public/img/rotulo-*.webp`, 1024 px): Silk & Thorn (verde-escuro, heroína-vespa de máscara branca e capa vermelha), Serpent Rage (preto/dourado, espadachim de haori listrado com cobra branca), Blue Bounce (creme e azul, mascote retrô), Neon Coast (synthwave). O Erick pediu **parecidos o máximo possível** com as referências (Hollow Knight Silksong x Guaraná, Demon Slayer x Monster, Berry Loops, Monster Vice City): personagens são fan art de IP alheio, mas **nomes e logos de marca real não são usados** (só nomes fictícios).
- A arte é **quadrada**; de frente a lata mostra menos que meia volta. Em `textures.js` ela ocupa 96% da altura e 78% da altura em largura, e o resto da volta vem das **bordas da própria arte esticadas** (sem blur: o Erick não quer desfoque).
- **Gotas de condensação** desenhadas por cima (1700 pequenas + 130 grandes com rastro + névoa fria), camada cacheada por tamanho (igual para todos os temas). Sem o cache e com blur, o TBT do celular passava de 500 ms.
- Rotulo 2:1 (primeira tentativa) cortava as pontas do texto: não voltar a esse formato.

## Rótulo panorâmico 360° e alto (25/11/2026, pedido do Erick)
- Os rótulos agora são **panoramas 2:1** (Magnific) que dão a volta inteira; assunto e texto no centro, laterais e costas continuam o cenário. Em `textures.js` a imagem ocupa o canvas todo e a faixa da direita (7%) é misturada com o início da esquerda para sumir a emenda das costas. Nada de blur, nada de arte quadrada com bordas esticadas.
- **Rótulo mais alto**: a lata é 18 mm mais alta (`EXTRA` em `generate-models.mjs`): o corpo cresce e as curvas de baixo e de cima mantêm o desenho ORIGINAL. **Nunca achatar as curvas** (a primeira tentativa deixou a lata baixa e feia, o Erick reclamou). Mudou o gerador? `node scripts/generate-models.mjs && node scripts/optimize-models.mjs`.
- As estampas dos outros temas só são pré-desenhadas 4 s depois (1,5 s entre elas) e as gotas têm metade da quantidade no celular: sem isso o TBT do celular passava de 600 ms.
- **Rótulo cobre o corpo inteiro** (pedido do Erick, 25/11): o corpo é UMA peça torneada (material `Label`) da curva da base até o fim do pescoço, com UV por altura; só o disco/anel de baixo e a borda do topo são `Aluminium`. A textura tem proporção 1,52:1 (`settings.js`: 2048×1344): o panorama fica na faixa do corpo reto (11% acima e 8% abaixo são a linha de borda esticada, em zonas curvas).
- **Cache de modelo:** `/models/*` é `max-age=0, must-revalidate` e a URL leva `?v=N` (`scene.js` e o preload do `index.html`). Incrementar o `v` ao trocar o `can.glb`.

## Menu lateral de quadrados (25/11/2026)
- Igual ao do `copos-laser`: grade de 2 colunas com a miniatura de cada tema (`public/img/thumb/<id>.webp`, 144 px, gerada por `node scripts/build-thumbs.mjs` a partir de `assets-src/rotulos/<id>.png`), faixa horizontal no celular, nome só em `aria-label`/`title`. Fundo de estúdio em CSS.
- **Para adicionar um tema:** (1) panorama 2:1 em `assets-src/rotulos/<id>.png`; (2) `public/img/rotulo-<id>.webp` (2048x1024); (3) linha em `config/themes.js`; (4) `node scripts/build-thumbs.mjs`. O menu cresce sozinho (rola quando passa da altura).
- ElevenLabs só gera áudio: **não gera imagem**. Os rótulos vêm do Magnific (`images_generate`, 135 créditos cada).

## Estúdio "Sua arte" (25/11/2026, pedido do Erick)
- O visitante envia a imagem (SVG/PNG/JPG/WebP, até 12 MB, fica no navegador) e ajusta para pegar os 360°: **encaixe** (repetir até fechar a volta / esticar nos 360° / uma vez no meio), **tamanho**, **posição vertical**, **giro na volta** e **cor de fundo** (sugerida pela média das bordas da imagem). A faixa planificada no painel mostra a volta inteira, com a emenda nas pontas. Código: `modules/studio.js`, `drawCustom` e `readUpload` em `modules/textures.js`, `CUSTOM_THEME` em `config/themes.js`.
- A arte vai na faixa do corpo reto (11% do topo, 81,6% da altura do canvas); o resto (pescoço e curva da base) leva a cor de fundo. As gotas de condensação entram por cima na lata, mas **não** no arquivo para imprimir.
- **Baixar o rótulo**: PNG 4096 × 2688 px (207 × 136 mm, ~500 dpi gravado em `pHYs`, `png-dpi.js`), sem as gotas.
- Entrada: botão "Enviar a minha arte" no cabeçalho e o quadrado "+" da grade. O tema só vira ativo depois do envio.

## 11 temas e referências (25/11/2026)
- Temas novos (Magnific, a partir de referências do Erick, fiéis ao desenho/estilo com nomes trocados e NEXUS): Cauldron Ale, Nexus Juice, Jungle Nexus, Deep Nexus 24, Gorgon IPA, Wolves of Nexus, Nexus Viper (+ os 4 de antes). `assets-src/rotulos/*.png` versionados.
- As **22 referências originais** estão em `assets-src/referencias/` (fora do git: arte de terceiros). Quais já foram usadas e quais faltam: na memória do projeto (`referencias-rotulos-latinha-pendentes`). Só os 3 primeiros "outros" temas são pré-desenhados no ocioso; o resto é desenhado ao escolher.
- Regra: o nome Nexus é permitido aqui (projeto pessoal); a proibição vale só para os repos da Bannerjet.

## Skills para repetir o trabalho (25/11/2026)
Skills globais em `~/claude-config/skills/` (viajam entre as máquinas): `modelo-3d-copo-lata` (modelar no Blender via MCP, medir foto, exportar, plugar no site), `rotulo-lata-magnific` (rótulos panorâmicos a partir de referências, upload, conferência, tema + miniatura) e `arte-gravacao-laser-copo` (SVG/PDF/pacote PNG -> máscara, 360°, arquivo da fibra). Invocar a skill antes de refazer qualquer um desses fluxos.
