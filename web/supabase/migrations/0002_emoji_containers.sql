-- Cada projeto/área/recurso pode ter um emoji como símbolo (feedback da Fase 1)
alter table public.kairos_containers add column if not exists emoji text;
