-- 3ª rodada de refino — prioridade do dia pode ser avulsa (texto livre, sem tarefa).
-- Ex.: "preparação para a reunião da tarde". "feita" vive aqui só para as avulsas;
-- quando a prioridade aponta para uma tarefa, o status continua vindo da tarefa.

alter table public.kairos_prioridades alter column tarefa_id drop not null;
alter table public.kairos_prioridades add column if not exists titulo text;
alter table public.kairos_prioridades add column if not exists feita boolean not null default false;
alter table public.kairos_prioridades add constraint kairos_prioridades_alvo
  check (tarefa_id is not null or titulo is not null);
