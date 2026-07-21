# Plano de implementação — redesign 2026-07 (Claude Design)

O Raul redesenhou o Kairós inteiro no Claude Design (mobile + desktop, claro + escuro).
O handoff está em `prototipos/redesign-2026-07/` (README = escopo e telas aprovadas,
TOKENS.md = tema claro, DARK-MODE.md = mapa claro → escuro, `design/kairos-mobile.dc.html`
= canvas com todas as telas — o arquivo foi renomeado ao entrar no repo; no README original
ele se chama `Kairós Mobile.dc.html`). **Este handoff substitui o protótipo v6 como
especificação visual.** Fidelidade: alta — recriar pixel-perfect, cores/copy/interações são finais.

> **Revisão (21/07):** a primeira versão deste plano foi escrita contra um clone desatualizado
> (docs/08). Na verdade o app já tem Marcos 1–7, Google sync, revisão semanal (wizard),
> notas + grafo, páginas PARA, Arquivo, prioridades persistentes, recorrência e PWA
> (docs/09–19, migrações até 0011). O plano abaixo já está corrigido: o grosso do trabalho é
> **revestir o app existente com o design novo**, criando só o que ainda não existe.

## Leitura do handoff em uma frase

Não é um retoque: é uma pele e uma navegação novas por cima de um app já quase completo.
Shell novo (trilho de 76px no desktop, tab bar com + central no mobile), tela "Hoje" como
centro, "Check do dia" renomeado para **Despacho**, PARA reorganizado no hub **Espaços** —
e algumas peças realmente novas: **modo escuro**, **kanban de tarefas**, **hub Espaços**,
**página de Pessoas**, **captura como paleta ⌘K**, **revisão semanal em formato jornal**.

## Estado real × handoff

| Já existe (reveste com o design novo) | Não existe (constrói na etapa) |
|---|---|
| Dia/Semana/Mês/Ano (`TimeGrid`, `WeekView`…), painel de evento, sem-horário, dia inteiro | Modo escuro completo (tokens + ◐) |
| Check do dia (`TriageModal`, destino a destino) — vira **Despacho** | Shell novo: trilho 76px / tab bar com + central |
| Captura (`CaptureFab`, atalho "c", imagem, parser com chips) — vira paleta ⌘K | Hero "Agora" time-aware na Hoje |
| Tarefas com filtros (`TasksView`) | Kanban (colunas de altura fixa + toggle Lista) |
| Páginas PARA (`ParaPage`), Arquivo, desarquivar | Hub **Espaços** em grid + página de **Pessoas** |
| Notas com leitura Obsidian (`NotesView`, `markdown.ts`), grafo com filtros/foco (`GraphView`) | Editor com **markdown vivo colorido** (hoje edição é textarea simples) |
| Revisão semanal wizard (`RevisaoModal`) | Formato **jornal 14a** (manchete, narrativa, âncoras, citação) |
| Prioridades do dia/semana persistentes (`kairos_prioridades`, avulsas) | — (★ do dia = já mapeia em `kairos_prioridades`) |
| PWA (manifest, sw), fonte Inter na leitura | Fonte **Lora** (display) e tokens do handoff |

## Mudanças de banco (mínimas)

- Migração **0012**: `kairos_containers.cor text` — o handoff pinta eventos/chips/nós do grafo
  com a cor do projeto/área (terracota, verde, lilás…), além do ícone atual.
- ★ "prioridade do dia" **não** precisa de coluna: é `kairos_prioridades` (escopo dia), que já existe.
- Revisão formato jornal: agregados/âncoras no `placar jsonb` de `kairos_rituais`; reflexão
  ("Coluna do editor") salva como nota da semana em `kairos_notas`.
- Derivados seguem calculados, nunca colunas: streak 🔥, saúde de área, confiabilidade de pessoa.

## Etapas (cada uma ≈ uma sessão/PR, sempre com `npm run build` verde e app usável no fim)

### Etapa A — Fundamentos: tokens, tema escuro e shell novo
Telas: shell de 10a (desktop) + 2a/16b (tab bar mobile) · 16a/16b (escuro)
1. Design tokens como CSS custom properties em `globals.css`, direto de TOKENS.md, com o
   bloco escuro de DARK-MODE.md sob `[data-theme='dark']`. Fonte **Lora** via `next/font`
   (Inter já mostrou o caminho). Ícones: recriar os SVGs do canvas (traço 1.7–1.8) como
   componentes — sem lib externa.
2. Shell responsivo substituindo `Sidebar`/`Topbar`/bottomnav: desktop = trilho esquerdo 76px
   (K, Hoje, Agenda, + central, Tarefas, Espaços, ◐ tema, avatar R); mobile = tab bar
   Hoje · Calendário · + · Tarefas · **Espaços** (atenção do README: em 2a aparece
   "Projetos", o final é "Espaços" como em 16b).
3. Tema claro/escuro/sistema no ◐ (localStorage, sem flash — script inline no layout).
   As views atuais ganham as cores novas "de graça" na medida em que usarem os tokens;
   ajustes finos ficam para as etapas de cada tela.
4. Regra de rolagem desktop: página nunca rola; cada painel rola por dentro com fade + "+ N ↓".
5. Tudo que existe continua acessível e funcionando dentro do shell novo — nada quebra em produção.

### Etapa B — Hoje (10a desktop · 2a mobile)
- Header: saudação Lora + progresso "2 de 5" + navegação ‹ hoje › + segmented Dia/Semana/Mês/Ano
  (as quatro views já existem — entram no novo header).
- Hero **"Agora"** time-aware (compromisso corrente com barra de progresso), timeline do dia
  no layout do canvas, "A seguir" com borda esquerda na cor do container (usa a `cor` da 0012).
- Coluna direita: card quente do Despacho (terracota), **Tarefas do dia** com ★ (=`kairos_prioridades`),
  Em espera / Amanhã.
- Mobile: seletor de 7 dias, blocos empilhados.

### Etapa C — Captura ⌘K (10b)
- A lógica do `CaptureFab` (parser, imagem, @pessoa→responsável, texto persistente) migra para a
  paleta de comando: ⌘K ou + do trilho; tabs Tarefa/Nota/Evento (Tab alterna), chips de parsing
  em tempo real, ⏎ cria, Esc fecha. Mobile: + central abre leque (tarefa/nota/evento).
- Regra vigente mantida: `#projeto`//`área` reconhecidos → direto, sem Inbox.

### Etapa D — Despacho (11a desktop · 2b + gestos 3a mobile)
- Renomear em toda a UI: **Despacho**. A máquina de estados GTD do `TriageModal` fica.
- Desktop: fila à esquerda (300px), card central com 6 destinos sempre visíveis
  (Agendar · Delegar · Vira nota · Referência · Incubar · Descartar), atalhos 1–6,
  "Para quando?" + projeto, rodapé ⏎/E/⌫/F, sequência 🔥.
- Mobile: bottom sheet sobre a Hoje escurecida (overlay rgba(38,34,27,0.45) — reservado a
  rituais), um item por vez, progresso em segmentos, swipe direito = Planejar.
- Atalhos globais desktop consolidados: ⌘K captura · D Despacho · N nova nota · E expandir · Esc.

### Etapa E — Tarefas: kanban (11b)
- Kanban de altura fixa: A fazer / Em andamento / Em espera / Concluídas hoje (status já existem);
  toggle **Colunas/Lista** (a lista atual do `TasksView`, revestida, é o modo Lista).
- Chips de filtro; cards em espera com borda tracejada + @pessoa + data de cobrança (=`prazo`).

### Etapa F — Espaços: hub + Pessoas (11c, 15a–d · 7a mobile)
- Hub em grid 3 colunas: Projetos, Áreas, Pessoas, Grafo (miniatura), Notas recentes, Arquivo —
  títulos linkam para as páginas (ParaPage e Arquivo já existem; ganham o layout 15a/15b/15d).
- **Pessoas** 15c (nova): badges de pendências, o que está com cada um + data de cobrança,
  histórico de entregas, confiabilidade — tudo derivado de `kairos_tarefas` em espera/concluídas.
- Áreas 15b: saúde calculada (verde em dia / terracota pede atenção / âmbar quieta demais).
- Arquivo 15d: busca com highlight, filtros por tipo, ↩ Restaurar; conferir que incubados
  voltam ao Despacho na data marcada (`incubada_ate`).

### Etapa G — Notas: editor com markdown vivo (12a, 12b, 13a · 8a mobile)
- A leitura Obsidian existe; o salto é o **editor**: highlight em tempo real ([[conexões]] lilás,
  @pessoas terracota, #projetos verde) — implementação própria e leve (overlay sobre textarea ou
  contenteditable controlado), mono dos tokens.
- Layout 12a: lista 300px + editor; toggle Editar/Leitura; ? = guia de marcações (popover escuro);
  E expande (12b, coluna 720px), Esc volta; rodapé "Conexões".
- Mobile 8a: barra de formatação sobre o teclado.

### Etapa H — Grafo (12c · 8b)
- `GraphView` já tem filtros/foco/arquivados — reveste com 12c e completa: "Só vizinhos",
  slider de profundidade (saltos), card do nó selecionado, zoom +/−/⌖; cores por tipo dos tokens.

### Etapa I — Revisão semanal formato jornal (14a · 2c mobile)
- O wizard do `RevisaoModal` dá lugar ao formato 14a (síntese FINAL de 13b+13d): epígrafe com
  citação da semana (lista curada com autor + obra), esquerda "A semana que passou" (manchete,
  narrativa gerada com números em negrito, barras por dia com melhor dia ★, "Ficou para trás"
  com reagendar/soltar, "Coluna do editor"), direita "A semana que começa" (até 3 âncoras,
  "Semear na agenda" com sugestão de horários por heurística de vãos livres, CTA "Começar a semana ✓").
- Persistência: agregados+âncoras no `placar` de `kairos_rituais`; reflexão vira nota da semana.

### Etapa J — Polimento
- Varredura pixel-perfect contra o canvas (claro e escuro, mobile e desktop), rolagens internas,
  estados vazios, notificação do Despacho no PWA existente.
- Apertar políticas `jim_*` antes de qualquer compartilhamento (aviso do CLAUDE.md).

## Ordem e porquê

A→B→C→D são o coração diário (shell, Hoje, captura, Despacho). E→F completam a gestão
(kanban e Espaços). G→H→I são o ciclo de conhecimento e o ritual semanal. J fecha.
Dentro de cada etapa: desktop e mobile juntos (mesmos componentes, layout responsivo),
claro e escuro juntos (os tokens da Etapa A tornam isso quase gratuito).

## Riscos e decisões em aberto

1. **Editor markdown vivo (G)** é o maior risco técnico — protótipo cedo dentro da etapa; se
   contenteditable brigar com o teclado do celular, o fallback é overlay de highlight sobre
   textarea (mesma aparência, seleção nativa).
2. **Shell novo (A)** troca a navegação de um app grande de uma vez — mitigação: o shell novo
   renderiza as views existentes sem mexer nelas; qualquer regressão é de navegação, não de dado.
3. **Sugestão de horários (I)**: heurística de vãos livres da agenda; nada de IA externa.
4. **Google sync**: o redesign não mexe no espelho (`gcal.ts`); a timeline nova lê os mesmos eventos.

## Referências rápidas

- Handoff: `prototipos/redesign-2026-07/README.md` (telas por id), `TOKENS.md`, `DARK-MODE.md`.
- Canvas: abrir `design/kairos-mobile.dc.html` e buscar `id="10a"` etc. Rodadas antigas no canvas
  são histórico — só as telas listadas no README são especificação.
- Estado do app antes do redesign: `docs/19-...md` (mais recente) e anteriores.
