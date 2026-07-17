# Notas estilo Obsidian, filtros do grafo e Arquivo — status (17/07/2026)

**Banco:** nenhuma migração nova (a coluna `arquivado_em` da 000x já existia; só passou a ser lida).

## 1 · Leitura das notas mais moderna (pedido do Raul, inspiração Obsidian)

- **Fonte nova**: Inter (via `next/font` — baixada no build e servida do nosso domínio,
  nada externo em runtime). Só na **leitura** da nota; a edição segue simples, em monospace.
- [[links]] aparecem **sem os colchetes** na leitura (como no Obsidian): texto na cor de
  destaque com sublinhado suave; hover realça. Clique continua abrindo/criando a nota.
- `- [ ]` viram **checkboxes desenhadas** (☑ feita = caixa preenchida + texto riscado apagado).
- #tags como pílulas; citação com barra lateral limpa (sem fundo); listas com marcador suave;
  medida de leitura de 72ch e entrelinha 1.75.

## 2 · Grafo com filtros

- **Chips por tipo** (Notas, Projetos, Áreas, Recursos, Pessoas) com a bolinha da cor do nó —
  ligam/desligam cada camada.
- **Foco**: um select "Foco: tudo" lista projetos/áreas/recursos (arquivados com ▤) — ao focar,
  só o escolhido e a vizinhança direta dele ficam no grafo.
- **▤ Arquivados** no filtro (com contador), ligado por padrão.

## 3 · Arquivado com cara de arquivado (o A do PARA)

- **No grafo**: nó, rótulo e arestas do arquivado ficam **apagados** (alpha ~0.38) com prefixo ▤;
  entrada "Arquivado" na legenda.
- **Arquivo de verdade**: a sidebar ("Arquivo", com contador) e a bottomnav do celular abrem a
  página do Arquivo — lista apagada com tipo e data de arquivamento; clique abre a página.
- **Página do container arquivado**: título apagado, chip "▤ arquivado em dd/mm" e botão
  **↩ desarquivar** (no lugar do "▤ arquivar"). Tarefas e notas continuam lá.
- **Notas**: nota agrupada num projeto arquivado mostra o chip do grupo apagado com ▤
  (antes aparecia como "sem grupo", porque a lista só trazia ativos).
- Dado: `listContainers()` agora traz todos com `arquivado_em`; o AppShell separa ativos do
  Arquivo. `desarquivarContainer()` novo em `db.ts`.

## Como foi verificado

- `cd web && npm run build` ✓ · markdown: 9/9 verificações (tsx) ✓
- Chromium + Playwright **com Supabase mockado por interceptação** (sessão semeada no
  localStorage + `page.route` no REST): leitura da nota, clique em wikilink, grafo com os três
  estados de filtro (tudo / sem arquivados / foco), página do Arquivo e página de projeto
  arquivado com desarquivar — sem erros de console. Script em anexo na sessão (scratchpad).

## Próximos passos

1. Teste do Raul (tipografia da leitura, filtros do grafo, Arquivo).
2. Fila que segue: renovação do token Google (Edge Function), Web Push, apertar políticas `jim_*`,
   OAuth Microsoft, importador Todoist.
