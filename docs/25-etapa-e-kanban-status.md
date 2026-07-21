# Etapa E do redesign — Tarefas kanban (11b/6b) · v0.6.0 (21/07/2026)

Quinta etapa de `docs/20-plano-redesign.md`. Sem migração (os status já existiam no banco).

## O que mudou

1. **Kanban de altura fixa** (tela 11b) como modo padrão do desktop: colunas
   A fazer · Em andamento · Em espera · Concluídas hoje, cada uma rolando **por
   dentro** com fade e "+ N ↓" no limite (a página não rola, regra do redesign).
2. **Arrastar um card para outra coluna muda o status** — soltar em "Concluídas
   hoje" conclui de verdade (`concluirTarefa`, respeitando recorrência); a coluna
   alvo ganha contorno tracejado verde. O payload é o mesmo do arrasto para a
   grade do Dia (`application/json`), então nada conflita.
3. **"Algum dia" recolhido** no rodapé da última coluna ("Algum dia · N itens —
   recolhido ▸"); expandir mostra os cards ali mesmo, de onde podem ser
   arrastados de volta para "A fazer".
4. **Toggle Colunas/Lista** (pílula segmentada, lembrada em `localStorage`);
   o modo **Lista** é a 6b: cards com checkbox 19px, espera com borda **e**
   caixa tracejadas, concluídas sem borda, apagadas e riscadas. No celular é
   sempre lista (o toggle some).
5. **Chips de filtro** no lugar da barra antiga, sem perder os filtros
   combinados do Raul (docs/14): "Todas · N" (limpa), "Hoje", e **"+ filtro"**
   abre um popover com busca por texto, grupo, **responsável (novo)** e prazo
   (todas/hoje/esta semana/vencidas/sem prazo). Cada filtro ativo vira um chip
   escuro com × (ex.: "▶ Sede nova ×", "@Ana ×").
6. **Cards fiéis à 11b**: ★ terracota = prioridade do dia (`kairos_prioridades`);
   chips ▶ projeto (verde), /área (neutro), prazo ("hoje" quente, "venceu dd/mm"
   vermelho, "amanhã"/data neutros), ⟳ recorrência; **em espera** com borda
   tracejada e "@pessoa · cobrar dd/mm" (= prazo, como no plano).
7. `AppShell`: novo `moverTarefa` (drop do kanban → `mudarStatusTarefa` + toast
   por destino); `TasksView` recebe `prioDia` e `onStatus`.
8. Detalhe de CSS que custou caro: os blocos `.stagger` criam contextos de
   empilhamento (animação com fill), então o popover do "+ filtro" ficava por
   baixo do kanban — resolvido com `z-index: 30` na linha de filtros.
9. Versão **v0.6.0** (só frontend).

## Como foi verificado

- `npm run build` ✓ (com o cache `.next` limpo — o dev server chegou a servir
  CSS velho e confundir o teste do popover).
- Playwright/Chromium com página demo temporária (removida do commit):
  kanban claro/escuro 1280×820, lista, "Algum dia" expandido, popover de filtro,
  filtro por grupo com chip ×, mobile 402×874 claro/escuro — zero erros de
  console. `dragAndDrop` real: card → Em andamento (`status`), card →
  Concluídas hoje (`conclude`) ✓.

## Próximo passo

**Etapa F — Espaços: hub + Pessoas** (11c, 15a–d · 7a mobile): hub em grid
3 colunas, página de **Pessoas** (badges de pendências, cobranças,
confiabilidade — tudo derivado das tarefas), saúde das áreas, Arquivo 15d.
