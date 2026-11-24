# Latinha · latas 3D personalizadas

Landing page 3D de uma marca fictícia de **latinhas personalizadas**. A lata gira, inclina em direção ao cursor e recebe a estampa
que você escolher: um dos quatro temas prontos ou a sua própria lata, com a sua arte, o seu nome e a sua cor. A estampa é desenhada
na hora num `<canvas>` e aplicada como textura no modelo 3D.

**No ar:** https://latinhas-3d.vercel.app

É também um estudo de front-end: motion design, 3D no navegador e performance tratada como requisito, com cada otimização
justificada por um número medido antes e depois.

> Latinha é uma marca inventada. Nenhuma marca real de bebida, embalagem ou modelo 3D de terceiros foi usada:
> a lata e os elementos decorativos são gerados por código (`scripts/generate-models.mjs`).

## O que a página faz

- **Lata 3D com `<model-viewer>`** (three.js por baixo) que inclina em direção ao ponteiro em tempo real. Sem mouse (celular),
  ela passeia sozinha numa curva lenta e o dedo assume enquanto toca a tela.
- **Elementos 3D em volta** (fatias de limão, cerejas, mirtilos, folhas de menta, estrelas) com parallax de profundidade e um
  **campo de repulsão** que os afasta do ponteiro.
- **Troca de tema coreografada com GSAP**: um círculo da cor nova abre a partir da lata, a lata gira 720° com **motion blur**
  (filtro SVG horizontal proporcional à velocidade angular) e a estampa troca **no pico do giro**; ao mesmo tempo os elementos
  **implodem para dentro da lata, trocam de modelo e explodem** para posições novas.
- **Estúdio "Sua lata"**: nome, cor (8 amostras + seletor livre), envio de imagem (PNG/JPG/WebP, nunca sai do navegador) e dois
  layouts (selo redondo ou arte inteira). Cada mudança redesenha a estampa e aplica na lata na hora; "Baixar a estampa" gera o PNG
  4096×2048 pronto para virar rótulo.
- **Responsivo de verdade**: no celular o layout se reorganiza, o menu é próprio (painel em tela cheia, foco preso, Esc fecha),
  o estúdio vira uma folha inferior e a cena usa **4 elementos 3D em vez de 9**, estampa em 1024 px em vez de 2048 e menos bolhas.

## Como rodar

```bash
npm install
npm run dev               # http://localhost:5173
npm run build && npm run preview   # versão de produção em http://localhost:4173
```

Regenerar os assets (só é preciso se mudar o gerador):

```bash
npm run models:raw        # gera os .glb crus em assets-src/models-raw (não versionados)
npm run models:optimize   # pipeline -> public/models + reports/models.md
npm run images:capture    # com o dev rodando: prints PNG 2x de cada tema -> assets-src/img-raw
npm run images:optimize   # -> public/img (WebP 480/960 + og.jpg) + reports/images.md
```

Medir:

```bash
npm run measure:lighthouse -- depois 3   # Lighthouse celular + desktop, mediana de 3 -> reports/lighthouse-depois.md
npm run measure:runtime -- depois        # layouts/recálculos de estilo/FPS com o mouse mexendo
npm run measure:profile -- 390 844 depois   # perfil de CPU: % da thread principal ocupada
```

## Arquitetura

O ponto de partida foi o caminho direto (um script carregando tudo de uma vez). Virou camadas em que cada peça vive isolada:

```
src/
  main.js              entrada leve: CSS, menu, seletor, cards. Pinta sem esperar o 3D e importa scene.js depois do load
  scene.js             tudo que é 3D: ordem de carregamento, medidas, ligação dos módulos
  config/
    themes.js          temas (cores com contraste conferido, padrão da estampa, modelo dos elementos) + tema personalizado
    settings.js        todos os "quantos": elementos por tela, inclinação, repulsão, giro, escalonamento, resolução da estampa
  modules/
    loop.js            um único requestAnimationFrame; pausa com a aba escondida ou o herói fora da tela
    pointer.js         posição do ponteiro (o listener só guarda números) + passeio automático sem mouse
    can.js             lata: inclinação, giro, motion blur, textura (cache por tema)
    elements.js        elementos: layout por tema, parallax, repulsão, implosão/explosão, troca de modelo, tingimento
    theme-switch.js    a coreografia GSAP (fila: só o último pedido vale se clicarem no meio de uma troca)
    textures.js        a estampa no canvas: padrões, nome com ajuste de tamanho, selo da arte, código de barras nas costas
    customizer.js      estúdio "Sua lata"
    bubbles.js         bolhas de gás num canvas 2D (sprite desenhado uma vez, depois só drawImage)
    menu.js            menu do celular
    ui.js              seletor (radiogroup com setas), textos do sabor, cards
    mv-patch.js        contorno de um bug do model-viewer 4.4 (abaixo)
  styles/              tokens, base, header, hero, studio, sections
scripts/               gerador e pipeline dos modelos, imagens, medições
```

### Decisões que valem registrar

- **Estampa no canvas para tudo**, não só no tema personalizado. Os temas prontos também são desenhados em runtime: zero imagem de
  textura para baixar, e o mesmo código serve para o estúdio. As texturas dos temas ficam em cache e as dos outros temas são geradas
  no ocioso, então a troca no pico do giro é instantânea.
- **A lata só aparece com a estampa certa** (`reveal="manual"` + `dismissPoster()` depois do `setTexture`). Por isso a textura
  embutida no `.glb` vai em 256 px: ela nunca é vista.
- **O loop nunca lê o DOM.** Posição dos elementos na tela é calculada a partir do próprio estado; o tamanho do herói vem de um
  `ResizeObserver` e o deslocamento, do evento de scroll. Dentro do `requestAnimationFrame` só há escrita (`transform`, atributo).
- **Carregamento escalonado:** primeira pintura (HTML + CSS + 5 KB de JS) → `load` → chunk do 3D → lata → elementos um a um a cada
  160 ms → no ocioso, os modelos dos outros temas (`fetch` com prioridade baixa) e as estampas dos outros temas.
- **Fonte self-hosted** (Bricolage Grotesque, subconjunto latino só com o eixo de peso, 40 KB, com `preload`) e uma fonte de
  fallback com métricas ajustadas para o texto não pular quando ela chega.
- **Meshopt sem CDN:** o decodificador já vem no bundle do model-viewer; ele só é ativado quando `meshoptDecoderLocation` aponta
  para um script, então `public/decoders/meshopt-ready.js` é um arquivo vazio que cumpre esse papel.
- **`prefers-reduced-motion`:** sem giro, sem blur, sem bolhas; a troca de tema vira uma troca direta.

## O estudo: números antes e depois

"Antes" é a v0 (commit `v0: primeira versão funcional...`): modelos crus como saem do gerador (malha densa, texturas PNG 4K),
Google Fonts por CDN, model-viewer no bundle principal, todos os modelos carregados de uma vez, 9 elementos também no celular e a
repulsão perguntando ao DOM onde cada elemento está (`getBoundingClientRect` por elemento, a cada frame).
"Depois" é a versão publicada. Medições locais com `vite preview` (mesmo servidor para as duas), Chrome 158, Lighthouse 13.6.

### Lighthouse (mediana de 3 execuções)

| | Performance | Acessibilidade | Boas Práticas | SEO | FCP | LCP | TBT | Peso |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Celular, antes | 56 | 100 | 100 | 100 | 2,9 s | 2,9 s | 3.894 ms | 11,86 MB |
| **Celular, depois** | **100** | **100** | **100** | **100** | **0,8 s** | **0,8 s** | **40 ms** | **0,64 MB** |
| Desktop, antes | 98 | 100 | 100 | 100 | 0,7 s | 0,7 s | 28 ms | 11,86 MB |
| **Desktop, depois** | **100** | **100** | **100** | **100** | **0,2 s** | **0,2 s** | **0 ms** | **0,59 MB** |

Em produção (https://latinhas-3d.vercel.app, Vercel com compressão e cache), mesma mediana de 3: **celular 100 · 100 · 100 · 100**
(FCP/LCP 0,8 s, TBT 52 ms, 0,58 MB) e **desktop 100 · 100 · 100 · 100** (LCP 0,3 s, TBT 0 ms, 0,53 MB).

Honestidade sobre o TBT: parte da queda vem de o 3D ser importado depois do `load`, o que tira o parse do model-viewer da janela
que o Lighthouse mede. O custo continua existindo, só não bloqueia a primeira pintura nem a interação com o texto. O que mede o
3D de verdade é a tabela de execução abaixo.

### Modelos 3D (`scripts/optimize-models.mjs`)

| Modelo | Antes | Depois | Redução | Triângulos antes | Triângulos depois |
|---|---:|---:|---:|---:|---:|
| lata | 5.363 KB | 91,4 KB | 98,3% | 34.640 | 12.592 |
| limão | 2.479 KB | 24,5 KB | 99,0% | 29.268 | 3.510 |
| cereja | 1.530 KB | 30,3 KB | 98,0% | 55.296 | 6.634 |
| mirtilo | 1.375 KB | 30,3 KB | 97,8% | 49.348 | 6.054 |
| menta | 548 KB | 9,7 KB | 98,2% | 7.420 | 1.008 |
| estrela | 49,3 KB | 4,7 KB | 90,4% | 516 | 254 |
| **Total** | **11,3 MB** | **191 KB** | **98,3%** | | |

Pipeline (gltf-transform 4): `reindexCreased` (próprio) → remoção da textura escovada do metal → `flatten` → `join` → `weld` →
`simplify` (MeshoptSimplifier, alvo e erro por modelo) → `textureCompress` para WebP (256 px na lata, 512 nos elementos) →
`prune` → `dedup` → `meshopt` (quantização + compressão).

### Imagens dos cards (`scripts/optimize-images.mjs`)

Prints PNG em 2x (~0,9 MB cada) viram WebP de **~9 KB (480 px) e ~22 KB (960 px)**, servidos com `srcset`, `loading="lazy"` e
dimensões declaradas. A imagem de compartilhamento cai de 223 KB (PNG) para 62 KB (JPG 1200×630).

### Em execução: 6 s com o mouse mexendo sobre o herói

| | Recálculos de estilo/s | Thread principal ocupada | Só recálculo de caixa envolvente (4 s) |
|---|---:|---:|---:|
| Desktop, antes | 493 | 78,0% | 1.713 ms |
| **Desktop, depois** | **60** | **14,4%** | **175 ms** |
| Celular, antes | 515 | 79,3% | 1.819 ms |
| **Celular, depois** | **61** | **12,7%** | **146 ms** |

Medido com Playwright + CDP (`Performance.getMetrics` e `Profiler`), Chrome headless com GPU. Tabelas completas em `reports/`.

### O que as medições ensinaram (e o achismo teria errado)

1. **O anel da lata pesava mais que a lata.** O lacre, uma peça de 2 cm, tinha **23 mil dos 38 mil vértices** do modelo. Geometria
   extrudada sai sem índice (3 vértices por triângulo, normal por face): nada solda e o simplificador não tem o que colapsar. Os gomos
   do limão tinham o mesmo problema (69 mil vértices). O passo `reindexCreased` recalcula normais por ângulo de vinco e reindexa: o
   limão foi de 334 KB para 24,5 KB só com isso.
2. **Uma textura de 3,6 MB que não fazia nada.** A textura "escovada" do alumínio vira ruído liso quando reduzida. Sem ela, as UVs do
   metal também sobram, e sem UV a emenda solda: a lata foi de 151 KB para 91 KB.
3. **O "reflow forçado" não era layout.** Ler `getBoundingClientRect` depois de escrever só `transform` não dispara layout no Chrome
   (transform não invalida layout). O que dispara é **recálculo de estilo forçado**: 8 por frame na v0, um por elemento. Tirar a
   leitura do loop levou a 1 por frame.
4. **O custo de verdade estava escondido no model-viewer.** A métrica `ScriptDuration` do CDP mal mudou entre as versões; o perfil de
   CPU mostrou outra história: a cada mudança de `orientation`, o model-viewer recalcula a caixa envolvente percorrendo **todos os
   vértices**. Com malhas cruas, isso comia 1,8 s a cada 4 s. Malha enxuta é performance de runtime, não só de download.
5. **Bug do model-viewer 4.4.0:** mudar `orientation` chama `arRenderer.onUpdateScene()` mesmo fora de AR e quebra a cada frame
   (`presentedScene` nulo). `mv-patch.js` só deixa o método rodar quando há AR de verdade.

## Acessibilidade

Conteúdo legível sem 3D; modelos decorativos com `aria-hidden`; a lata tem `alt`. Seletor de tema como `radiogroup` com setas;
estúdio com rótulos, foco no primeiro campo e retorno do foco ao fechar; menu com `aria-expanded`, foco preso e Esc. O texto do
herói muda de cor com o tema e cada par cor de fundo × texto passa no contraste AA; no tema personalizado, a cor do texto é escolhida
pela luminância da cor escolhida.

## Limitações conhecidas

- O canvas não aplica o eixo de tamanho óptico da fonte variável, então o nome na lata usa o desenho de texto pequeno da Bricolage.
- As medições foram feitas em Chrome headless numa máquina Apple Silicon; num Android de entrada o FPS real vai ser menor. O ganho
  relativo (menos vértices percorridos por frame, menos recálculo de estilo) é o que se transfere.

## Créditos

Fonte [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) (OFL) via Fontsource. Modelos 3D gerados por código neste
repositório. Estudo inspirado num post sobre uma landing 3D de refrigerante; a marca, os modelos e o código aqui são próprios.

Feito por Erick Dantas · [github.com/ErickkADR](https://github.com/ErickkADR)
