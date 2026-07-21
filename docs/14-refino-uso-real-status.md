# Refino do uso real — 1ª rodada de feedback do Raul (sessão de 13/07/2026)

**Produção:** https://projeto-jarvis-seven.vercel.app · **Banco:** migração 0007 (`recorrencia`, `recorre_ate`)

Nove ajustes pedidos pelo Raul depois de usar o app de verdade (login Google + sync funcionando).

## O que mudou

1. **Rolagem das notas (bug)** — no desktop, o `body` tem `overflow: hidden` e o `.canvas` nunca era
   limitado (min-height:auto de grid/flex), então nota longa em visualização estourava sem rolagem.
   Corrigido com `grid-template-rows: minmax(0,1fr)` no `.app` + `min-height: 0` em `.main`/`.canvas`
   — o canvas é o contêiner de rolagem no desktop; no celular a página continua rolando.
2. **Painel lateral do evento** (`EventoPanel`) — clicar num evento abre painel com horário, origem,
   grupo e as **notas do evento** (abrir ou criar); Editar/Excluir saem dele. Evento do Google é
   somente leitura ("edite lá"). Clicar numa vaga vazia continua criando evento.
3. **Bandeja "Sem horário" compacta** — recolhida por padrão ("☐ N sem horário ▾"), expande no clique.
4. **Check do dia** — menu suspenso para **escolher qual item triar** (o primeiro fica pré-selecionado);
   e ao zerar a Inbox, nova etapa: **dar horário às tarefas de hoje** que não têm (o Kairós propõe
   vagas realmente livres da agenda; "sem horário" é sempre opção). É o caminho sem arrastar no celular.
5. **Captura com data → tarefa direto** (Inbox só para o incompleto: sem grupo E sem prazo);
   com **hora** ("sexta 14h") já entra na grade do dia (1h). Toast confirma "já na agenda 📅".
6. **Filtros na visão Tarefas** — busca por texto + grupo (select) + prazo (todas/hoje/esta semana/
   vencidas/sem prazo), combinados. Grupos vazios somem enquanto um filtro está ativo.
7. **Recorrência** — clicar numa tarefa abre o novo `TarefaModal` (edição completa: título, grupo,
   prazo, status, **recorrência** diária/semanal/quinzenal/mensal e **repetir até**). Concluir uma
   recorrente cria a próxima ocorrência sozinha (mensal preserva o dia; dia 31 vira o último do mês).
   Migração 0007. Chip "⟳ semanal" na lista.
8. **Revisão semanal em wizard** — uma etapa por tela (1/7), Voltar/Avançar, pontinhos de progresso,
   Concluir só no fim. As decisões continuam aplicáveis em qualquer etapa.
9. **Sync de TODAS as agendas Google** — o sync agora lê `calendarList` e importa cada agenda visível
   (ex.: pessoal + **Marista**), não só a principal. `google_id` virou `agenda/evento` (sem colisão);
   os espelhos no formato antigo são limpos automaticamente pela própria varredura de janela.

## Como verificar

- `cd web && npm run build` ✓ · Chromium: as 7 visões navegam sem erro de console ✓
- Rolagem: reproduzido e corrigido com Playwright (roda do mouse: antes 0px, depois 800px) ✓
- Recorrência sob RLS real: insert com `recorrencia`/`recorre_ate` ✓ (rollback)

## Pendente de teste pelo Raul

Sync multiagendas com o token real (o ambiente bloqueia googleapis) — deve aparecer no toast
"N eventos de M agendas". Recorrência e wizard em produção.

## Próximos passos

1. Feedback desta rodada.
2. Páginas PARA (projeto/área/recurso com objetivos, tarefas e notas vinculadas).
3. OAuth Microsoft + Outlook (credenciais na Azure — docs/11).
