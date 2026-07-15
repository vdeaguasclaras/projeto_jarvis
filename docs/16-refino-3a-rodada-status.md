# 3ª rodada de refino do uso real — status (sessão de 15/07/2026)

**Produção:** https://projeto-jarvis-seven.vercel.app · **Banco:** migração 0009 (`kairos_prioridades.titulo`/`feita`, `tarefa_id` opcional)

Treze pedidos do Raul depois de registrar os projetos e áreas de verdade.

## O que mudou

1. **Ícone (ex-emoji) com campo livre** — `IconePicker` compartilhado: opções prontas + campo para
   **colar qualquer emoji** (do computador ou de site). Usado na criação e no "✎ editar" das páginas
   PARA (antes a edição era um campinho de texto obscuro; a criação já funcionava — áreas do Raul
   com emoji existem no banco). Renomeado "Símbolo" → "Ícone" em toda a UI.
2. **Sidebar com seções expansíveis** — Projetos/Áreas/Recursos recolhem (chevron ›), contador
   aparece quando fechado, estado lembrado em `localStorage` (`kairos.sidebar.abertos`).
3. **Barra de rolagem discreta** — `scrollbar-width: thin` + WebKit estilizado com os tokens
   (`--line`, hover `--ink-3`), global (sidebar, canvas, painéis).
4. **Projeto ↔ área** — `area_id` (já existia no schema 0001, nunca exposto): escolha da área ao
   criar projeto e no editar; chip "▣ parte de …" na página do projeto (clicável); seção
   **"Projetos desta área"** na página da área com abertas/% concluído.
5. **Duração padrão 30 min** — arrasto da bandeja/coluna, "reservar horário" do check e captura com
   hora agora usam 30 min (antes 1h); `agendarTarefa` persiste `duracao_min` a cada arrasto.
6. **Painel lateral da tarefa (`TarefaPanel`)** — substitui o modal: título, **com/sem horário**
   (dia + início + duração), **anotações** (`descricao`), grupo, **responsável** (@pessoa), status,
   recorrência, concluir pelo checkbox do cabeçalho. Abre de TODO clique em tarefa: grade do Dia e
   da Semana, coluna sem horário, lista de Tarefas, páginas PARA, chips de prioridade (padrão
   Notion pedido pelo Raul). `EventoModal` também virou painel lateral.
7. **Prioridades repensadas** — o modal mostra as **sugestões do Kairós** (chips + Adicionar),
   menu suspenso com **todas** as tarefas abertas, e **prioridade avulsa** de texto livre
   ("preparação para a reunião") — migração 0009.
8. **Prioridades acionáveis** — chip com ★/✓ (conclui a tarefa ou marca a avulsa), texto abre o
   painel, e **dá para arrastar o chip para a grade** para reservar horário.
9. **Grafo completo** — projetos/áreas/recursos aparecem SEMPRE (antes só quando ligados a nota);
   aresta estrutural projeto→área; clique no nó abre a página PARA. (Vincular nota a projeto/área
   já existia: chip "sem grupo ▾" no editor de notas.)
10. **Navegar entre dias** — visão Dia com ‹ hoje › + seletor de data; check do dia/placar só
    aparecem vendo hoje; prioridades são as do dia visto. Na **Semana, clicar no cabeçalho do
    dia abre o Dia** (Mês/Ano→Semana→Dia). "Hoje" na sidebar volta para hoje.
11. **3 protótipos do topo do Dia** — `prototipos/topo-dia-{a,b,c}.html`:
    A) faixa única de status + prioridades em destaque; B) check vai para a sidebar (anel de
    progresso); C) captura em botão flutuante com compositor (imagem + atalho). O atalho **c**
    para focar a captura já foi implementado no app real. Aguardando escolha do Raul.
12. **Coluna "Sem horário" no Dia** — ao lado da grade (empilha no celular): concluir, abrir o
    painel, arrastar para a grade, e input de tarefa rápida para o dia visto.
13. **Captura com texto persistente** — marcadores viram texto legível ("/Marial" → "Marial"), data
    e hora saem COM a preposição ("…do Marial por e-mail", não "…do por e-mail, às"); @pessoa vira
    registro e **responsável da tarefa** (chip @nome nas listas). Marcador de tipo errado
    (ex.: /Marial sendo projeto) agora resolve por fallback. **Bugs pré-existentes corrigidos:**
    "amanhã" nunca era reconhecido (`\b` + acento) e "terça"/"sábado" não resolviam data
    (chaves acentuadas vs. normalizadas).

## Como verificar

- `cd web && npm run build` ✓ · Chromium: 7 visões sem erros de console; atalho c; seções da sidebar ✓
- Parser: casos do Raul via `npx tsx` (inclusive "Enviar a programação do /Marial por e-mail, hoje às 9h") ✓
- RLS real (rollback): prioridade avulsa + feita, `area_id` de projeto, tarefa com descrição/duração ✓

## Próximos passos

1. Feedback do Raul; **escolher o protótipo do topo do Dia** (A/B/C) para implementar.
2. Se for a C (ou se ele quiser em qualquer caso): imagem na captura via Supabase Storage.
3. Continuam na fila: renovação do token Google (Edge Function), Web Push, apertar `jim_*`.
