-- Um projeto pode pertencer a VÁRIAS áreas ao mesmo tempo (pedido do Raul).
-- O vínculo sai da coluna kairos_containers.area_id (1:1, mantida por
-- compatibilidade mas não usada mais) e vira uma tabela N:N.

create table public.kairos_projeto_areas (
  user_id uuid not null references auth.users (id) on delete cascade,
  projeto_id uuid not null references public.kairos_containers (id) on delete cascade,
  area_id uuid not null references public.kairos_containers (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (projeto_id, area_id)
);

alter table public.kairos_projeto_areas enable row level security;
create policy "dono" on public.kairos_projeto_areas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index kairos_projeto_areas_area on public.kairos_projeto_areas (user_id, area_id);

-- leva os vínculos 1:1 já existentes para a tabela nova
insert into public.kairos_projeto_areas (user_id, projeto_id, area_id)
  select user_id, id, area_id from public.kairos_containers
  where area_id is not null
  on conflict do nothing;
