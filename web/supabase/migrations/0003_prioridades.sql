-- Marco 5 — prioridades do dia e da semana (persistentes)
-- Cada prioridade aponta para uma tarefa; "feita" deriva do status da tarefa.
-- escopo 'dia': data = o próprio dia · escopo 'semana': data = a segunda-feira da semana.

create table public.kairos_prioridades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  escopo text not null default 'dia' check (escopo in ('dia', 'semana')),
  data date not null,
  tarefa_id uuid not null references public.kairos_tarefas (id) on delete cascade,
  ordem smallint not null default 0,
  criado_em timestamptz not null default now(),
  unique (user_id, escopo, data, tarefa_id)
);

alter table public.kairos_prioridades enable row level security;
create policy "dono" on public.kairos_prioridades for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index kairos_prioridades_user_data on public.kairos_prioridades (user_id, escopo, data);
