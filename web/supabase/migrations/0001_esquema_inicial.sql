-- Kairós — schema inicial (Fase 1, doc 07)
-- Tudo pertence a um usuário; RLS garante o isolamento.
-- Tabelas prefixadas com kairos_ para conviver com outro app no mesmo banco
-- (decisão: usar o projeto Supabase "mapa-de-sala" até migrar/planificar).

-- PARA: projetos, áreas e recursos são "containers"
create table public.kairos_containers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('projeto', 'area', 'recurso')),
  nome text not null,
  descricao text,
  objetivo text,
  prazo date,                                        -- só projetos têm prazo
  status text not null default 'ativo',
  area_id uuid references public.kairos_containers (id),    -- projeto ↔ área (backlink)
  arquivado_em timestamptz,
  criado_em timestamptz not null default now()
);

-- @pessoas: registros do usuário, sem conta própria
create table public.kairos_pessoas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  papel text,
  criado_em timestamptz not null default now()
);

create table public.kairos_notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  md text not null default '',
  container_id uuid references public.kairos_containers (id),  -- grupo OPCIONAL (Zettelkasten)
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create table public.kairos_tarefas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  descricao text,
  container_id uuid references public.kairos_containers (id),
  responsavel_id uuid references public.kairos_pessoas (id),
  prazo date,
  duracao_min int,
  prioridade smallint not null default 3,
  status text not null default 'a_fazer'
    check (status in ('a_fazer', 'em_andamento', 'em_espera', 'concluida', 'algum_dia')),
  agendada_inicio timestamptz,
  agendada_fim timestamptz,
  nota_origem_id uuid references public.kairos_notas (id),   -- encaminhamento que virou tarefa
  incubada_ate date,                                  -- resurfacing (volta à Inbox)
  criada_em timestamptz not null default now(),
  concluida_em timestamptz
);

create table public.kairos_eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  origem text not null default 'local' check (origem in ('local', 'google', 'outlook')),
  origem_id_externo text,
  container_id uuid references public.kairos_containers (id),
  nota_id uuid references public.kairos_notas (id),          -- a nota nasce do evento
  criado_em timestamptz not null default now()
);

-- Backlinks: [[nota]], projeto, área, recurso ou @pessoa citados numa nota
create table public.kairos_nota_links (
  nota_id uuid not null references public.kairos_notas (id) on delete cascade,
  alvo_tipo text not null check (alvo_tipo in ('nota', 'container', 'pessoa')),
  alvo_id uuid not null,
  primary key (nota_id, alvo_tipo, alvo_id)
);

create table public.kairos_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  texto text not null,
  origem text not null default 'captura',
  incubada_ate date,
  triado_em timestamptz,
  criado_em timestamptz not null default now()
);

-- Rituais + gamificação (placar do dia / da semana, sequências)
create table public.kairos_rituais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('check_dia', 'revisao_semana')),
  data date not null,
  placar jsonb not null default '{}',
  unique (user_id, tipo, data)
);

-- ── Row-Level Security: cada linha pertence ao seu usuário ──
alter table public.kairos_containers enable row level security;
alter table public.kairos_pessoas    enable row level security;
alter table public.kairos_notas      enable row level security;
alter table public.kairos_tarefas    enable row level security;
alter table public.kairos_eventos    enable row level security;
alter table public.kairos_nota_links enable row level security;
alter table public.kairos_inbox      enable row level security;
alter table public.kairos_rituais    enable row level security;

create policy "dono" on public.kairos_containers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.kairos_pessoas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.kairos_notas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.kairos_tarefas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.kairos_eventos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.kairos_inbox for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.kairos_rituais for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- nota_links herda o dono da nota
create policy "dono via nota" on public.kairos_nota_links for all
  using (exists (select 1 from public.kairos_notas n where n.id = nota_id and n.user_id = auth.uid()))
  with check (exists (select 1 from public.kairos_notas n where n.id = nota_id and n.user_id = auth.uid()));

-- Índices dos acessos mais comuns
create index kairos_tarefas_user_status on public.kairos_tarefas (user_id, status);
create index kairos_tarefas_incubadas on public.kairos_tarefas (user_id, incubada_ate) where incubada_ate is not null;
create index kairos_eventos_user_inicio on public.kairos_eventos (user_id, inicio);
create index kairos_inbox_user_pendentes on public.kairos_inbox (user_id) where triado_em is null;
create index kairos_notas_user on public.kairos_notas (user_id, atualizada_em desc);
