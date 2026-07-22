# Etapa G do redesign — Notas: editor com markdown vivo (12a/12b/13a/8a) · v0.8.0 (22/07/2026)

Sétima etapa de `docs/20-plano-redesign.md`. Sem migração. Era o **maior risco
técnico do plano** — resolvido com a abordagem de fallback recomendada, que se
mostrou sólida de primeira.

## O que mudou

1. **Editor com markdown vivo** (`EditorVivo.tsx`): um `<pre>` colorido atrás e
   um `textarea` com texto transparente na frente, métricas de fonte idênticas,
   rolagem sincronizada — caret e seleção nativos, cor por cima. O novo
   `mdVivoHtml` (em `lib/markdown.ts`) preserva o texto **caractere a caractere**
   (regra de ouro do alinhamento): `##` verde, `**`/`*` apagados com conteúdo em
   negrito/itálico, `-` terracota, `> ` citação em itálico, **[[conexões]] lilás
   com fundo, @pessoas terracota, #projetos verde** — sem mudar tamanho de fonte
   nem padding horizontal (divergência decidida vs. o canvas, que aumenta títulos;
   aumentar desalinharia o overlay). Verificado por medição: `scrollHeight` e
   `clientWidth` do overlay e do textarea idênticos após digitação.
2. **Layout 12a**: "Salvo ✓ / salvando…" de verdade (acompanha o autosave),
   pílula **Editar/Leitura**, botão **?** e **⤢ Expandir (E)**; título grande
   editável; rodapé **Conexões** ([[links]] clicáveis — abrem/criam a nota —,
   grupo, @pessoas e "N notas apontam para cá").
3. **Guia de marcações (13a)**: popover escuro ancorado no editor com as 11
   marcações; atalho `?` abre e fecha.
4. **Nota expandida (12b)**: tela cheia com coluna de 720px, header "‹ Notas Esc ·
   Salvo ✓ · ⇱ Recolher", edição ou leitura, conexões; `Esc` volta. Renderizada
   via **portal no body** — o `.view-in` tem `transform` (animação stagger) que
   prenderia o `position: fixed` dentro do canvas.
5. **Celular (8a)**: barra de formatação B · I · H2 · •— · [[ ]] · @ · #
   (sticky acima da tab bar/teclado) inserindo a marcação no cursor, com seleção
   envolvida quando houver.
6. **Atalhos**: `n` nova nota · `e` expande · `?` guia · `Esc` fecha guia/expandida
   (não conflitam com os globais do AppShell: 1–7, c, D).
7. Correção de regressão da Etapa E: o `.seg { display: none }` do celular
   escondia também o toggle Editar/Leitura — escopado para `.tv-filtros .seg`.
8. Versão **v0.8.0** (só frontend).

## Como foi verificado

- `npm run build` ✓ · Playwright/Chromium com página demo temporária e Supabase
  **interceptado por rota** (o dev não tem env; `.env.local` temporário +
  `page.route`, nada saiu para a rede): leitura, editor vivo claro/escuro,
  digitação com medição do alinhamento, guia, expandida (leitura e edição),
  barra mobile — zero erros de console. Demo e `.env.local` removidos.

## Próximo passo

**Etapa H — Grafo (12c · 8b)**: revestir o `GraphView` (filtros/foco/arquivados já
existem) com o layout novo e completar: "Só vizinhos", slider de profundidade
(saltos), card do nó selecionado, zoom +/−/⌖, cores por tipo dos tokens.
