# Coluna "sem horário" enxuta + projeto em várias áreas — status (15/07/2026, 3ª parte)

**Banco:** migração 0011 (`kairos_projeto_areas`, N:N com backfill do antigo `area_id`).

## 1 · Coluna "Sem horário" do Dia (feedback do Raul)

- **Recolhível**: o cabeçalho vira botão (▾/▴). No **celular começa fechada** (só o contador) —
  a lista empilhada estava deixando a página longa demais; no desktop começa aberta.
- **Paginada**: 7 tarefas por página com pager ‹ 1/3 › — a coluna nunca fica mais comprida
  que a grade de horários no desktop.

## 2 · Projeto em VÁRIAS áreas (N:N)

- `kairos_containers.area_id` (1:1) deixa de ser usado; vínculos agora em `kairos_projeto_areas`
  (user_id, projeto_id, area_id) com RLS "dono" e backfill automático dos vínculos existentes.
- **Criar projeto**: pílulas de múltipla escolha das áreas. **Editar** (página do projeto): idem.
- **Página do projeto**: um chip "▣ área" clicável para CADA área vinculada.
- **Página da área**: lista os projetos vinculados (contadores + % + prazo) e as **tarefas dos
  projetos entram na lista de tarefas da área**, cada uma com o chip do projeto (o "devido
  destaque"); a barra de progresso da área passa a incluir os projetos vinculados.
- **Grafo**: uma aresta projeto→área por vínculo (um projeto pode ter várias).

## Como verificar

- `cd web && npm run build` ✓ · Chromium: visões sem erros ✓
- RLS real (rollback): projeto vinculado a 2 áreas ao mesmo tempo ✓

## Próximos passos

1. Teste do Raul (coluna recolhida no celular, paginação, multiáreas).
2. Fila: renovação do token Google (Edge Function), Web Push, apertar `jim_*`.
