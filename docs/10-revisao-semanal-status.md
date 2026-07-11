# Revisão semanal — status (sessão de 11/07/2026)

**Produção:** https://projeto-jarvis-seven.vercel.app · **Banco:** tabelas `kairos_*` (sem migração nova — `kairos_rituais` e `kairos_prioridades` já suportavam)

## O que foi entregue

Modal **Revisão semanal** (item ⟳ na sidebar, chip vira ✓ quando a revisão da semana está registrada) —
os 7 passos do protótipo v6 sobre dados reais:

1. **Como foi a semana** — barra de % concluído (concluídas na semana ÷ concluídas + abertas com prazo
   até domingo), 🔥 sequência de revisões semanais, melhor dia, chips (tarefas, horas de "foco" na agenda,
   capturas triadas, vencidas → passo 4) e o balanço das prioridades da semana que fecha (✓ / parcial / não andou).
2. **Vislumbre da próxima semana** — compromissos por dia (seg–sex) lendo `kairos_eventos`; dia com ≥ 5h
   ganha ⚠; frase aponta o dia mais livre.
3. **Prioridades da próxima semana** — o Kairós **propõe** (salvas, senão as com prazo até o fim dela),
   o usuário decide; grava em `kairos_prioridades` (escopo `semana`, âncora na segunda seguinte).
4. **Reagendar vencidas** — sugere seg–qui da próxima semana pré-selecionados (espalhados) + "outra data…"
   com o parser da captura ("24/07", "dia 24", "próxima sexta"); atualiza só o `prazo`.
5. **Bloco de foco** — calcula janelas realmente livres (9h–18h, seg–sex, ≥ 2h, máx. 3h) descontando os
   eventos da próxima semana; "outro horário…" aceita "seg 14h-16h"; cria evento "🎯 Foco protegido".
6. **Projeto parado** — projeto com tarefas abertas e sem atividade (criação/conclusão) há ≥ 10 dias;
   propõe título de próximo passo editável + dia; cria a tarefa no projeto.
7. **Inbox** — em dia ou com pendências (aponta para o check do dia) + incubadas dormindo e quando a
   próxima volta.

Concluir grava `kairos_rituais` (tipo `revisao_semana`, upsert por dia) com o placar da semana.
"Depois" fecha sem registrar. Cada decisão tem o próprio botão "→" e vira "✓" ao aplicar.

## Decisões desta sessão

- **Sem migração**: prioridades da semana seguinte usam a âncora de segunda-feira já existente; o ritual
  usa o `tipo` `revisao_semana` previsto desde a migração 0001.
- A revisão abre em **qualquer dia** (não só domingo): fecha a semana corrente (seg–dom) e decide a seguinte.
- `Tarefa` agora carrega `criada_em` (para detectar projeto parado).
- Sequência 🔥 conta semanas *anteriores* consecutivas com revisão; o toast de conclusão soma a atual.

## Como verificar

- `cd web && npm run build` (feito, passa).
- Banco sob RLS real: upsert de `revisao_semana` + consultas de triadas/incubadas testados via
  `execute_sql` com `role authenticated` + claims (em transação com rollback — nada persistiu).
- Produção após o merge: `mcp__Vercel__web_fetch_vercel_url`.

## Próximos passos (ordem do CLAUDE.md)

1. **Marco 7** — PWA completo (service worker, notificação do check do dia; melhorar o arrastar no toque).
2. OAuth Google/Microsoft (Marco 2 restante) · **Fase 2** — sync Google Calendar/Outlook.
3. **Fase 5** — importador do Todoist.
4. Mês/Ano do calendário (restante do Marco 5), se o Raul sentir falta.
