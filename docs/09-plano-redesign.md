# Plano de implementação — redesign 2026-07 (Claude Design)

O Raul redesenhou o Kairós inteiro no Claude Design (mobile + desktop, claro + escuro).
O handoff está em `prototipos/redesign-2026-07/` (README = escopo e telas aprovadas,
TOKENS.md = tema claro, DARK-MODE.md = mapa claro → escuro, `design/kairos-mobile.dc.html`
= canvas com todas as telas — o arquivo foi renomeado ao entrar no repo; no README original
ele se chama `Kairós Mobile.dc.html`). **Este handoff substitui o protótipo v6 como
especificação visual.** Fidelidade: alta — recriar pixel-perfect, cores/copy/interações são finais.

## Leitura do handoff em uma frase

Não é um retoque: é um app novo por cima do mesmo modelo de dados. Shell novo (trilho de
76px no desktop, tab bar com + central no mobile), tela "Hoje" centrada no calendário,
"Check do dia" renomeado para **Despacho**, "Projetos/Áreas/…" reorganizados no hub
**Espaços**, e áreas inteiras que hoje não existem no app (notas com markdown vivo, grafo,
revisão semanal, kanban, páginas de Pessoas e Arquivo, modo escuro).

## O que aproveitamos do app atual

| Mantém (lógica) | Reescreve (visual) | Não existe ainda |
|---|---|---|
| `lib/parser.ts` (captura com chips — vira a base do parsing do ⌘K) | `AppShell`, `Sidebar`, `Topbar` → shell novo | Notas + editor markdown vivo |
| `lib/db.ts` (acesso Supabase; cresce, não muda de natureza) | `TriageModal` → Despacho (a máquina de estados da triagem GTD fica) | Grafo |
| Auth por link mágico | `TasksView` → kanban/lista | Revisão semanal |
| Schema `kairos_*` (cobre ~90% do estado do handoff) | `DayView` → Hoje | Modo escuro, Pessoas, Arquivo, PWA |

## Mudanças de banco (poucas — o schema da Fase 1 previu quase tudo)

Migração `0003` no início da Etapa A:

- `kairos_containers.cor text` — o handoff usa cor por projeto/área (terracota, verde, lilás…) além do emoji.
- `kairos_tarefas.estrela boolean default false` — ★ "prioridade do dia" é marcação do dia, distinta de `prioridade` (que é GTD). Persistente, como pede o Marco 5.
- `kairos_rituais` já guarda a revisão semanal (`tipo='revisao_semana'`, `placar jsonb` recebe âncoras/agregados); a reflexão vira nota via `kairos_notas` (já previsto: "tudo salvo como nota da semana").
- Derivados **não** viram coluna: streak 🔥 (conta `kairos_rituais`), saúde de área, confiabilidade de pessoa, histórico de entregas — tudo calculado por consulta.
- Data de cobrança de tarefa delegada = `prazo` da tarefa em espera (já existe).

## Etapas (cada uma ≈ uma sessão/PR, sempre com `npm run build` verde e app usável no fim)

### Etapa A — Fundamentos: tokens, tema e shell novo
Telas: shell de 10a (desktop) + 2a/16b (tab bar mobile) · 16a/16b (escuro)
1. Design tokens como CSS custom properties em `globals.css`, direto de TOKENS.md, com o
   bloco escuro de DARK-MODE.md sob `[data-theme='dark']` + `prefers-color-scheme`.
   Fonte **Lora** via `next/font`. Ícones: recriar os SVGs inline do canvas (traço 1.7–1.8)
   como componentes — sem lib externa, fiel ao desenho.
2. Shell responsivo: desktop = trilho esquerdo 76px (K, Hoje, Agenda, + central, Tarefas,
   Espaços, ◐ tema, avatar R); mobile = tab bar Hoje · Calendário · + · Tarefas · **Espaços**
   (atenção do README: em 2a aparece "Projetos", o final é "Espaços").
3. Tema claro/escuro/sistema no ◐ (persistência em localStorage, sem flash — script inline no layout).
4. Regra de rolagem desktop: página nunca rola; cada painel rola por dentro com fade + "+ N ↓".
5. As views atuais continuam funcionando dentro do shell novo (feias, mas vivas) — nada quebra em produção.

### Etapa B — Hoje (é o Marco 5 do plano antigo, com a cara nova)
Telas: 10a (desktop) · 2a (mobile)
- Header com saudação Lora + progresso "2 de 5" + navegação ‹ hoje › + segmented Dia/Semana/Mês/Ano
  (Semana/Mês/Ano podem nascer como estados simples e amadurecer depois; Dia é o completo).
- Hero **"Agora"** time-aware (compromisso corrente com barra de progresso), timeline do dia
  lendo `kairos_eventos`, "A seguir" com borda esquerda na cor do container.
- Coluna direita: card quente do Despacho (terracota), **Tarefas do dia** com ★ persistente,
  Em espera / Amanhã.
- Mobile: seletor de 7 dias, mesmos blocos empilhados.
- Arrastar tarefa para o dia (agenda a tarefa) — completa o Marco 5.

### Etapa C — Captura ⌘K
Tela: 10b (desktop) · leque do + central (mobile)
- Paleta de comando (⌘K ou +): tabs Tarefa/Nota/Evento (Tab alterna), parsing do
  `parser.ts` exibido como chips em tempo real, ⏎ cria, Esc fecha.
- Regra vigente mantida: `#projeto`//`área` reconhecidos → tarefa direto, sem Inbox.

### Etapa D — Despacho (rebatiza e reveste o Check do dia)
Telas: 11a (desktop) · 2b + gestos 3a (mobile)
- Renomear em toda a UI: **Despacho**. A lógica GTD do `TriageModal` é reaproveitada.
- Desktop: fila à esquerda (300px), card central com os 6 destinos sempre visíveis
  (Agendar · Delegar · Vira nota · Referência · Incubar · Descartar), atalhos 1–6,
  "Para quando?" + projeto, rodapé ⏎/E/⌫/F, sequência 🔥.
- Mobile: bottom sheet sobre a Hoje escurecida (overlay rgba(38,34,27,0.45) — reservado a
  rituais), um item por vez, progresso em segmentos, swipe direito = Planejar.
- Atalhos globais desktop entram aqui: ⌘K captura · D Despacho · Esc fecha (N e E chegam com Notas).

### Etapa E — Tarefas (kanban)
Tela: 11b (desktop) · 6x (mobile)
- Kanban de altura fixa: A fazer / Em andamento / Em espera / Concluídas hoje (os status já existem).
- Chips de filtro, toggle Colunas/Lista; cards em espera com borda tracejada + @pessoa + data de cobrança.

### Etapa F — Espaços: hub + Projetos, Áreas, Pessoas, Arquivo
Telas: 11c, 15a, 15b, 15c, 15d (desktop) · 7a (mobile)
- Hub em grid 3 colunas (títulos linkam para páginas dedicadas).
- **Projetos** 15a: lista com progresso + detalhe (meta com data, próximas ações incl. em espera, notas, pessoas, projeção de término).
- **Áreas** 15b: saúde calculada (verde em dia / terracota pede atenção / âmbar quieta demais → sugere ação ou arquivar).
- **Pessoas** 15c: badges de pendências, o que está com cada um + data de cobrança, histórico, confiabilidade.
- **Arquivo** 15d: busca com highlight, filtros por tipo, ↩ Restaurar; **incubados voltam sozinhos ao Despacho na data marcada** (a consulta da fila do Despacho passa a incluir `incubada_ate <= hoje`).

### Etapa G — Notas: editor markdown vivo
Telas: 12a, 12b, 13a (desktop) · 8a (mobile)
- Lista (300px) + editor; markdown com highlight em tempo real ([[conexões]] lilás,
  @pessoas terracota, #projetos verde) — implementação própria e leve (overlay sobre
  textarea ou contenteditable controlado), fonte mono dos tokens; sem lib pesada.
- `[[...]]`, `@`, `#` gravam `kairos_nota_links`; rodapé "Conexões"; toggle Editar/Leitura;
  ? abre o guia de marcações (popover escuro); E expande (12b, coluna 720px), Esc volta.
- Mobile 8a: barra de formatação sobre o teclado.

### Etapa H — Grafo
Telas: 12c (desktop) · 8b (mobile)
- Nós de `kairos_nota_links` + containers + pessoas; cores por tipo (lilás/terracota/verde/marrom).
- Filtros aditivos, foco + "Só vizinhos", slider de profundidade (saltos), zoom.
- Sugestão: layout de força com `d3-force` (só o módulo de simulação, render SVG próprio) —
  decidir na etapa; sem assets externos.

### Etapa I — Revisão semanal (item 2 do plano antigo, formato "jornal" 14a)
Telas: 14a (desktop — síntese FINAL de 13b+13d) · 2c (mobile)
- Epígrafe com citação da semana (rotativa, com autor + obra — lista curada no código).
- Esquerda "A semana que passou": manchete, narrativa gerada com números em negrito
  (agregados de tarefas/rituais/links da semana), barras por dia com melhor dia ★,
  "Ficou para trás" (reagendar/soltar), "Coluna do editor" (reflexão livre).
- Direita "A semana que começa": até 3 âncoras, "Semear na agenda" com sugestão de
  horários, CTA "Começar a semana ✓".
- Persistência: agregados+âncoras no `placar` de `kairos_rituais`; reflexão vira nota da semana.

### Etapa J — Polimento e PWA (Marco 7)
- Varredura pixel-perfect contra o canvas (claro e escuro, mobile e desktop).
- Service worker, manifest, notificação do Despacho.
- Apertar políticas `jim_*` antes de qualquer compartilhamento (aviso do CLAUDE.md).

## Ordem e porquê

A→B→C→D são o coração diário (shell, Hoje, captura, Despacho) e absorvem o Marco 5.
E→F completam a gestão (tarefas e Espaços). G→H→I são o ciclo de conhecimento e o ritual
semanal (I depende dos agregados que E/F/G tornam significativos). J fecha com PWA.
Dentro de cada etapa: desktop e mobile juntos (mesmos componentes, layout responsivo),
claro e escuro juntos (os tokens da Etapa A tornam isso quase gratuito).

## Riscos e decisões em aberto

1. **Editor markdown vivo (G)** é o maior risco técnico do handoff — protótipo cedo dentro da etapa; se contenteditable brigar com mobile, o fallback é overlay de highlight sobre textarea (mesma aparência, seleção nativa).
2. **Grafo (H)**: `d3-force` como dependência mínima vs. simulação própria — decidir com o canvas na mão.
3. **Semana/Mês/Ano na Hoje (B)**: o canvas detalha o Dia; os demais zooms nascem funcionais e simples e são refinados quando o Raul der feedback de uso.
4. **Sugestão inteligente de horários (I)**: primeira versão por heurística (vãos livres da agenda); nada de IA externa.

## Referências rápidas

- Handoff: `prototipos/redesign-2026-07/README.md` (telas por id), `TOKENS.md`, `DARK-MODE.md`.
- Canvas: abrir `design/kairos-mobile.dc.html` e buscar `id="10a"` etc. Rodadas antigas no canvas são histórico — só as telas listadas no README são especificação.
- Estado do app antes do redesign: `docs/08-fase-1-status.md`.
