-- Kairós — schema inicial (Fase 1, doc 07)
-- Tudo pertence a um usuário; RLS garante o isolamento.

-- PARA: projetos, áreas e recursos são "containers"
create table public.containers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('projeto', 'area', 'recurso')),
  nome text not null,
  descricao text,
  objetivo text,
  prazo date,                                        -- só projetos têm prazo
  status text not null default 'ativo',
  area_id uuid references public.containers (id),    -- projeto ↔ área (backlink)
  arquivado_em timestamptz,
  criado_em timestamptz not null default now()
);

-- @pessoas: registros do usuário, sem conta própria
create table public.pessoas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  papel text,
  criado_em timestamptz not null default now()
);

create table public.notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  md text not null default '',
  container_id uuid references public.containers (id),  -- grupo OPCIONAL (Zettelkasten)
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  descricao text,
  container_id uuid references public.containers (id),
  responsavel_id uuid references public.pessoas (id),
  prazo date,
  duracao_min int,
  prioridade smallint not null default 3,
  status text not null default 'a_fazer'
    check (status in ('a_fazer', 'em_andamento', 'em_espera', 'concluida', 'algum_dia')),
  agendada_inicio timestamptz,
  agendada_fim timestamptz,
  nota_origem_id uuid references public.notas (id),   -- encaminhamento que virou tarefa
  incubada_ate date,                                  -- resurfacing (volta à Inbox)
  criada_em timestamptz not null default now(),
  concluida_em timestamptz
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  inicio timestamptz not null,
  fim timestamptz not null,
  origem text not null default 'local' check (origem in ('local', 'google', 'outlook')),
  origem_id_externo text,
  container_id uuid references public.containers (id),
  nota_id uuid references public.notas (id),          -- a nota nasce do evento
  criado_em timestamptz not null default now()
);

-- Backlinks: [[nota]], projeto, área, recurso ou @pessoa citados numa nota
create table public.nota_links (
  nota_id uuid not null references public.notas (id) on delete cascade,
  alvo_tipo text not null check (alvo_tipo in ('nota', 'container', 'pessoa')),
  alvo_id uuid not null,
  primary key (nota_id, alvo_tipo, alvo_id)
);

create table public.inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  texto text not null,
  origem text not null default 'captura',
  incubada_ate date,
  triado_em timestamptz,
  criado_em timestamptz not null default now()
);

-- Rituais + gamificação (placar do dia / da semana, sequências)
create table public.rituais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('check_dia', 'revisao_semana')),
  data date not null,
  placar jsonb not null default '{}',
  unique (user_id, tipo, data)
);

-- ── Row-Level Security: cada linha pertence ao seu usuário ──
alter table public.containers enable row level security;
alter table public.pessoas    enable row level security;
alter table public.notas      enable row level security;
alter table public.tarefas    enable row level security;
alter table public.eventos    enable row level security;
alter table public.nota_links enable row level security;
alter table public.inbox      enable row level security;
alter table public.rituais    enable row level security;

create policy "dono" on public.containers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.pessoas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.notas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.tarefas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.eventos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.inbox for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono" on public.rituais for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- nota_links herda o dono da nota
create policy "dono via nota" on public.nota_links for all
  using (exists (select 1 from public.notas n where n.id = nota_id and n.user_id = auth.uid()))
  with check (exists (select 1 from public.notas n where n.id = nota_id and n.user_id = auth.uid()));

-- Índices dos acessos mais comuns
create index tarefas_user_status on public.tarefas (user_id, status);
create index tarefas_incubadas on public.tarefas (user_id, incubada_ate) where incubada_ate is not null;
create index eventos_user_inicio on public.eventos (user_id, inicio);
create index inbox_user_pendentes on public.inbox (user_id) where triado_em is null;
create index notas_user on public.notas (user_id, atualizada_em desc);
