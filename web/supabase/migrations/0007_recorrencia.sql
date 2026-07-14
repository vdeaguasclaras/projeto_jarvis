-- Refino do Raul — tarefas com recorrência
-- Ao concluir uma tarefa recorrente, o app cria a próxima ocorrência
-- (prazo + intervalo) enquanto não passar de recorre_ate.

alter table public.kairos_tarefas
  add column recorrencia text check (recorrencia in ('diaria', 'semanal', 'quinzenal', 'mensal')),
  add column recorre_ate date;
