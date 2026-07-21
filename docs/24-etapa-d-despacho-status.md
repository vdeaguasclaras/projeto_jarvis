# Etapa D do redesign — Despacho (11a/2b/3a) · v0.5.0 (21/07/2026)

Quarta etapa de `docs/20-plano-redesign.md`. Sem migração (o ritual continua `check_dia` no banco).

## O que mudou

1. **"Check do dia" agora é Despacho** em toda a UI (Hoje, notificação do PWA, toasts).
   O `TriageModal` deu lugar ao `Despacho.tsx`.
2. **Desktop = visão** (não mais modal): cobre o canvas ao lado do trilho, com header
   próprio (título + progresso em segmentos), **fila à esquerda** (300px, item ativo com
   borda verde; clicar troca o item) e o cartão da sequência 🔥 ("Zere hoje e são N").
3. **Card central com os 6 destinos sempre visíveis** — Agendar · Delegar · Vira nota ·
   Referência · Incubar · Descartar — com os parâmetros aparecendo por destino:
   "Para quando?" (**hoje é o primeiro chip** + amanhã/seg/🗓 escolher/sem data),
   projeto/área opcional, "delegar para" com @pessoa. CTA dinâmico ("Criar · hoje ✓").
4. **Atalhos do handoff**: `1–6` escolhe o destino · `⏎` confirma · `E` edita o título ·
   `⌫` **desfaz de verdade** (a criação é revertida — tarefa/nota excluída, item volta à
   fila; incubar/descartar também) · `F` = já fiz (regra dos 2 minutos). `Esc` fecha.
5. **Celular (2b/3a)**: bottom sheet sobre o fundo escurecido (overlay de ritual), destinos
   em grade 3×2, fila horizontal embaixo, **swipe para a direita = Planejar** (destaca
   Agendar). Corrigido um estouro horizontal (a fila de 200px/item ditava o mínimo do
   grid — `min-width: 0`).
6. A etapa final do ritual (dar horário às tarefas de hoje sem hora) foi **preservada**.
7. `criarTarefa` agora devolve `{ id, err }` (o desfazer precisa do id) — chamadores
   atualizados; novas `destriarItem`/`desincubarItem` no `db.ts`.

## Como foi verificado

- `npm run build` ✓ · Playwright/Chromium (página demo temporária, removida): teclas 1–6
  trocam destino, E foca a edição, clique na fila troca o item, layout desktop 11a e bottom
  sheet escuro 2b sem estouro — zero erros de console.

## Próximo passo

**Etapa E — Tarefas kanban** (11b): colunas de altura fixa (A fazer / Em andamento /
Em espera / Concluídas hoje), toggle Colunas/Lista, cards de espera com borda tracejada.
