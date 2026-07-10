# Marco 5 — calendário real (sessão de 10/07/2026)

**Produção:** https://projeto-jarvis-seven.vercel.app · **Banco:** tabelas `kairos_*` (migração 0003 aplicada)

## O que foi entregue

- **Dia com eventos reais**: a grade de horas lê `kairos_eventos`; clique numa vaga cria evento local
  (modal com título, dia, início/fim e projeto/área opcional); clique num evento edita/exclui.
- **Semana nova**: grade de 7 dias (seg–dom) com cabeçalho de dias, navegação ‹ hoje › entre semanas,
  eventos e blocos de tarefa. Sem login mostra convite para entrar.
- **Arrastar tarefa para o dia**: bandeja "Sem horário" (Dia: tarefas para hoje/vencidas; Semana:
  abertas com prazo na semana ou sem prazo) — arrastar para a grade preenche `agendada_inicio/fim`
  e o prazo acompanha o dia. Blocos existentes (eventos e tarefas) também se arrastam para outro
  horário/dia. Duplo clique num bloco de tarefa conclui; encaixe em meias horas.
- **Prioridades do dia e da semana persistentes**: tabela nova `kairos_prioridades`
  (escopo `dia`/`semana`; semana ancorada na segunda-feira; máx. 3, com ordem; RLS "dono").
  Chips ★ no topo do Dia e da Semana, riscadas quando a tarefa é concluída. No modal, o Kairós
  **propõe** (pré-seleciona as com prazo até a data-alvo) e o usuário decide — regra do produto.

## Decisões desta sessão

- Prioridade referencia uma **tarefa** (`tarefa_id`); "feita" deriva do status da tarefa — nada duplicado.
- Grade fixa 8h–19h que **estica** quando um bloco cai fora da faixa.
- Drag & drop nativo (HTML5) — não funciona em toque; no celular a bandeja mostra dica. Melhorar no PWA (Marco 7).
- Mês/Ano continuam "em construção" (restante do Marco 5, se o Raul sentir falta — a semana era o essencial).

## Como verificar

- `cd web && npm run build` (feito, passa).
- Banco sob RLS real: `execute_sql` com `set local role authenticated` + `request.jwt.claims`
  (testado: evento, prioridade e agendamento como dono ✓; outro usuário vê 0 linhas ✓).
- Produção após merge: `mcp__Vercel__web_fetch_vercel_url`.

## Próximos passos (ordem do CLAUDE.md)

1. **Revisão semanal** (domingo) com placar e decisões — espelhar o protótipo v6 (as prioridades da
   semana já persistem, a revisão vai usá-las).
2. **Marco 7** — PWA completo (service worker, notificação do check do dia).
3. OAuth Google/Microsoft · Fase 2 (sync agendas) · importador Todoist.
