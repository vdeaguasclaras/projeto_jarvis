# Handoff: Kairós — redesign completo (mobile + desktop)

## Overview
Redesign completo do Kairós, app pessoal de produtividade (tarefas + agenda + notas conectadas + delegação), com o objetivo de torná-lo mais moderno, pessoal e engajador. Cobre o app mobile inteiro e o app desktop inteiro, incluindo rituais (Despacho diário e Revisão semanal), grafo de conhecimento e modo escuro.

## About the Design Files
Os arquivos em `design/` são **referências de design criadas em HTML** — protótipos que mostram aparência e comportamento pretendidos, NÃO código de produção. A tarefa é **recriar estes designs no ambiente do codebase alvo** (React, Vue, SwiftUI, nativo etc.) usando seus padrões e bibliotecas — ou, se ainda não houver codebase, escolher o framework mais adequado e implementar lá.

O arquivo principal é `design/Kairós Mobile.dc.html`: um canvas com TODAS as rodadas de exploração, da mais recente (topo) à mais antiga (fim). **As versões finais aprovadas são as listadas abaixo** — rodadas antigas são histórico de exploração e NÃO devem ser implementadas.

## Fidelity
**High-fidelity (hifi).** Cores, tipografia, espaçamento, copy e interações são finais. Recriar pixel-perfect com as bibliotecas do codebase.

## Telas finais aprovadas (ids no canvas)

### Mobile (frame iOS 402×874)
- **2a — Hoje**: saudação "Bom dia, Raul" + avatar R (acesso à conta), seletor de 7 dias, hero "Agora" (compromisso corrente com barra de progresso), "A seguir" (cards de agenda com borda esquerda colorida), "Tarefas do dia" (★ = prioridade), card do Despacho. Tab bar: Hoje · Calendário · [+ central] · Tarefas · Espaços (ATENÇÃO: em 2a a última tab aparece como "Projetos"; a versão final é "Espaços", como em 16b).
- **2b — Despacho (Check do dia)**: bottom sheet sobre a Hoje escurecida, um item da Inbox por vez, progresso em segmentos. (No canvas ainda chamado "Check do dia" — o nome final é **Despacho**.)
- **2c — Revisão semanal mobile**: bottom sheet quase cheio, passos.
- **3a — Gestos do Despacho**: swipe direito = Planejar (abre Agendar/Delegar; "hoje" é o primeiro chip de Agendar).
- **6x — telas de fechamento do mobile** (Calendário, Tarefas etc.).
- **7a — Espaços (hub mobile)**: Projetos, Áreas, Pessoas, Notas, Grafo, Arquivo.
- **8a — Editor de nota**: markdown vivo com cor ([[conexões]] lilás, @pessoas terracota, #projetos verde), barra de formatação sobre o teclado.
- **8b — Grafo**: filtros por tipo, busca de foco, slider de profundidade.
- **16b — Hoje em modo escuro** (tabs finais).

### Desktop (janela 1280×820, canvas de altura fixa — painéis rolam por dentro, nunca a página)
Shell comum: trilho esquerdo de 76px (K logo, Hoje, Agenda, botão + circular central de captura, Tarefas, Espaços, ◐ tema, avatar R). Menu horizontal apenas com zoom temporal (Dia/Semana/Mês/Ano) na Hoje.
- **10a — Hoje**: header (saudação, progresso 2 de 5, navegação ‹ hoje ›, segmented Dia/Semana/Mês/Ano); grid 1fr + 340px: card "Agora" + timeline do dia (col. esquerda), card Despacho (quente, terracota) + Tarefas do dia + Em espera/Amanhã (col. direita).
- **10b — Captura**: paleta de comando (⌘K ou + do trilho), tabs Tarefa/Nota/Evento, parsing de linguagem natural em chips. Com #projeto vai direto, sem Inbox.
- **11a — Despacho**: fila à esquerda (300px), card central com 6 destinos sempre visíveis (Agendar · Delegar · Vira nota · Referência · Incubar · Descartar) com atalhos numéricos 1–6, "Para quando?" + projeto, rodapé de atalhos (⏎ confirma, E edita, ⌫ desfaz, F já fiz). Sequência 🔥.
- **11b — Tarefas**: kanban de altura fixa (A fazer / Em andamento / Em espera / Concluídas hoje), chips de filtro, toggle Colunas/Lista. Cards de espera com borda tracejada e @pessoa + data de cobrança.
- **11c — Espaços (hub)**: grid 3 colunas com seções Projetos, Áreas, Pessoas, Grafo (miniatura), Notas recentes, Arquivo. Títulos de seção linkam para páginas dedicadas.
- **12a — Notas**: lista (300px) + editor em painel; toggle Editar/Leitura; botão ? (guia de marcações); ⤢ Expandir (atalho E); rodapé "Conexões".
- **12b — Nota expandida**: tela cheia, coluna de leitura 720px, Esc volta.
- **12c — Grafo**: filtros por tipo (Notas lilás / Projetos terracota / Áreas verde / Pessoas marrom), foco + "Só vizinhos", card do nó selecionado, slider de profundidade (saltos), zoom +/−/⌖.
- **13a — Nota em modo Leitura** + popover escuro "Guia de marcações" (#, ##, ###, **, *, -, >, [[nota]], @nome, #projeto; atalho ?).
- **14a — Revisão semanal (FINAL)**: síntese aprovada de 13b+13d. Epígrafe com citação da semana (autor + obra). Duas colunas: esquerda "A semana que passou" (manchete estilo jornal, narrativa gerada com números em negrito, barras por dia com melhor dia ★, "Ficou para trás" com reagendar/soltar, "Coluna do editor" = reflexão do usuário); direita "A semana que começa" ("Na próxima edição…", até 3 âncoras, "Semear na agenda", sugestão inteligente de horários, CTA "Começar a semana ✓"). Tudo salvo como nota da semana. (13b, 13c e 13d foram exploração.)
- **15a — Projetos**: lista (ativos/pausados, barra de progresso) + detalhe (meta com data, próximas ações incl. em espera com @pessoa, notas, pessoas, projeção de término).
- **15b — Áreas**: grid com saúde (verde em dia / terracota pede atenção / âmbar quieta demais — sugere ação ou arquivar). Áreas ≠ Projetos (manter vs. terminar).
- **15c — Pessoas**: lista com badges de pendências + detalhe (o que está com a pessoa + data de cobrança, histórico de entregas, indicador de confiabilidade).
- **15d — Arquivo**: busca com highlight, filtros por tipo, ↩ Restaurar, incubados voltam sozinhos ao Despacho na data marcada.
- **16a — Hoje em modo escuro** (referência de aplicação do tema).

## Interactions & Behavior
- **Captura**: mobile = botão + central abre leque (tarefa/nota/evento); desktop = ⌘K ou + do trilho. Parsing de datas/pessoas/projetos em chips. Tab alterna tipo; ⏎ cria; Esc fecha.
- **Despacho**: um item por vez; destinos por clique ou teclas 1–6; ⏎ confirma; sequência de dias (🔥) como motivação. Mobile usa gestos (swipe direito = Planejar).
- **Rituais** (Despacho, Revisão semanal): fundo escurecido rgba(38,34,27,0.45) + conteúdo modal/bottom sheet. Reservado APENAS para rituais — nota de reunião usa painel lateral com botão expandir.
- **Notas**: markdown com highlight em tempo real; [[...]] cria conexão; Leitura renderiza limpo; ? abre guia; E expande; Esc recolhe.
- **Grafo**: filtros aditivos; foco reduz ao subgrafo; profundidade = nº de saltos.
- **Rolagem**: desktop nunca rola a página — cada painel rola internamente com fade + "+ N ↓" no limite.
- **Atalhos globais desktop**: ⌘K captura · D Despacho · N nova nota · E expandir nota · Esc fecha/volta · 1–6 destinos no Despacho.
- **Tema**: claro/escuro/seguir o sistema, alternado no ◐ do trilho ou ajustes.

## State Management (mínimo)
- Usuário (nome, avatar, streak de despacho), data/hora corrente (hero "Agora" é time-aware).
- Inbox (itens capturados), tarefas (status: a fazer/andamento/espera/concluída; ★; data; projeto/área; delegada a + data de cobrança), eventos, notas (grupo, conexões, menções), projetos (cor, meta, progresso), áreas (saúde), pessoas (pendências, histórico), arquivo (incl. incubados com data de retorno).
- Revisão semanal: agregados da semana (concluídas, despachos zerados, conexões novas, melhor dia), âncoras escolhidas, reflexões (persistidas como nota da semana), citação da semana (rotativa, com fonte).

## Design Tokens
Ver `TOKENS.md` (claro) e `DARK-MODE.md` (mapa completo claro → escuro).

## Assets
Nenhum asset externo. Ícones são SVGs inline (traço 1.7–1.8, cantos arredondados) — recriar com a lib de ícones do codebase mantendo o mesmo desenho. Fonte display: **Lora** (Google Fonts); texto/UI: system-ui.

## Files
- `design/Kairós Mobile.dc.html` — canvas com todas as telas (buscar pelos ids acima, ex. `id="14a"`)
- `design/ios-frame.jsx`, `design/browser-window.jsx`, `design/support.js` — molduras/runtime do protótipo (apenas para visualizar o HTML; não implementar)
- `TOKENS.md`, `DARK-MODE.md`
