# Etapas H, I e J do redesign — Grafo, Revisão-jornal e Polimento · v0.11.0 (22/07/2026)

As três últimas etapas de `docs/20-plano-redesign.md`, na mesma sessão (PR #30).
**O redesign 2026-07 está completo: A–J entregues.** Sem migração de banco.

## Etapa H — Grafo (12c · 8b) · v0.9.0

1. **Clique agora seleciona** o nó (antes abria direto): card 12c no canto com a
   cor do tipo, recheio (containers: tarefas abertas · notas · pessoas; demais:
   conexões), botão **Abrir** e **Só vizinhos** (= foco com 1 salto). Clicar numa
   pessoa abre a página Pessoas (a Etapa F a criou; saiu o toast de "não tem página").
2. **Foco por busca** ⌕ sobre notas/projetos/áreas/recursos/pessoas + chip
   "Foco: X ✕" — substitui o `<select>`; **profundidade da vizinhança por BFS**
   com slider (1–4 saltos).
3. **Zoom +/−/⌖** em torno do centro (desenho e picking compensam a escala).
4. Pills de filtro do canvas: **Tudo** + tipo com bolinha na cor dos tokens
   (nota lilás, projeto terracota, área verde, pessoa terracota-escura); a
   legenda separada saiu. Arquivados seguem como pill (▤, apagados no canvas).
5. Posições dos nós **persistem** entre filtros/seleção (`posRef`) — o grafo não
   embaralha ao filtrar. `Esc` fecha o card e depois o foco; **← Espaços** volta ao hub.

## Etapa I — Revisão semanal formato jornal (14a · 2c) · v0.10.0

O wizard de 7 passos (`RevisaoModal`) deu lugar ao **`RevisaoJornal`**:

1. **Epígrafe**: "Revisão semanal · edição nº N · dia" + citação da semana
   (lista curada com autor e obra, rotativa pelo número ISO da semana).
2. **A semana que passou**: manchete gerada (projeto que mais andou → "A semana
   em que X destravou"; senão pct/notas decidem), narrativa com números em
   negrito e comparação com a **média histórica** (placares anteriores), barras
   por dia com melhor dia ★ (terracota), **Ficou para trás** com
   reagendar/soltar por item, **Coluna do editor** (reflexão em serif itálico).
3. **A semana que começa**: até **3 âncoras** (tarefa das candidatas ou avulsa
   digitada; Kairós propõe 2 com prazo na semana), **Semear na agenda** — os
   maiores vãos livres (≥2h, 9h–18h, seg–sex) recebem as âncoras como eventos ⚓
   de 2h, pré-semeadas e removíveis com um toque —, CTA **Começar a semana ✓**.
4. **Persistência**: âncoras → `kairos_prioridades` (semana); semeadas →
   `kairos_eventos`; agregados+âncoras+manchete → `placar` jsonb de
   `kairos_rituais`; o jornal inteiro vira a nota **"Jornal da semana N"**.
5. **Celular (2c)**: bottom sheet quase cheio com 5 passos (tiles 2×2 no lugar
   da narrativa) e progresso em segmentos.
6. `db.ts`: `checksEntre`, `placaresDeRevisoes`, `soltarPrazoTarefa`.

## Etapa J — Polimento · v0.11.0

- **Verificação visual completa** (Playwright/Chromium, página demo temporária,
  Supabase interceptado por rota): grafo e jornal em claro/escuro ×
  desktop/celular, todos os passos do mobile, interações do grafo (busca→foco,
  slider, card, Só vizinhos, zoom) — zero erros de console. Demo removida.
- **Bugs achados e corrigidos**: dropdown da busca do grafo ficava atrás do
  canvas (stacking context do `.stagger` — mesmo caso do kanban; `z-index: 30`
  na linha de filtros); "Coluna do editor" vazava no passo 0 do celular
  (regra de display fora do seletor `[data-passo]`); "2 items" → "2 itens".
- CSS morto removido (`wk-*`, `gamebar` — o wizard antigo).
- Notificação do Despacho no PWA: **já existia** (Pwa.tsx, uma por dia com
  Inbox pendente, botão 🔔 no trilho) — conferida, nada a fazer.

## Políticas `jim_*` — RESOLVIDO no mesmo dia (remoção, não aperto)

Na conversa após a publicação, o Raul decidiu: o projeto do Jim **acabou**, então
em vez de apertar as políticas, as **19 tabelas `jim_*` foram removidas** (mais a
função `jim_touch_updated_at` e os 3 triggers) — migração **0012**, aplicada em
22/07/2026. Antes da remoção, backup completo validado (4.011 linhas + schema com
colunas/constraints/índices) foi entregue ao Raul na conversa
(`backup-jim-2026-07-22.zip`). O banco ficou só com as 10 `kairos_*`, todas com
RLS "dono" — o alerta de segurança que existia desde docs/08 deixou de existir.

**Sobras no storage** (arquivos não são exportáveis desta sessão — o proxy
bloqueia o endpoint de storage): bucket `sumulas` (público, 58 arquivos, 171 MB,
súmulas digitalizadas do Jim) e `cartoes-resposta` (privado, 2 arquivos, 23 MB,
origem incerta). Decisão do Raul pendente: baixar pelo painel do Supabase antes
de eu apagar, apagar direto, ou manter.

## Como foi verificado

- `npm run build` ✓ em cada etapa; screenshots em todos os modos; interações
  por Playwright com asserções (chip do foco, slider, card, "Só vizinhos").
- Produção: conferir `https://projeto-jarvis-seven.vercel.app` após o merge
  (via `mcp__Vercel__web_fetch_vercel_url` — o proxy bloqueia acesso direto).

## Próximos passos (o redesign acabou — volta o roteiro do produto)

1. OAuth Google/Microsoft (Marco 2 restante) e Fase 2 — sync Outlook.
2. Fase 5 — importador do Todoist (conector MCP já autorizado).
3. Políticas `jim_*` (acima) antes de compartilhar o app.
