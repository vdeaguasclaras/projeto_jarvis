-- Fase 5 — importador do Todoist
-- todoist_id marca a origem e torna a importação idempotente
-- (rodar de novo não duplica: índice único parcial por usuário).

alter table public.kairos_containers add column todoist_id text;
alter table public.kairos_tarefas    add column todoist_id text;
alter table public.kairos_inbox      add column todoist_id text;

create unique index kairos_containers_todoist on public.kairos_containers (user_id, todoist_id)
  where todoist_id is not null;
create unique index kairos_tarefas_todoist on public.kairos_tarefas (user_id, todoist_id)
  where todoist_id is not null;
create unique index kairos_inbox_todoist on public.kairos_inbox (user_id, todoist_id)
  where todoist_id is not null;
