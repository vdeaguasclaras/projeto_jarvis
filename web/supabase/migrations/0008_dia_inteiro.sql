-- Eventos de dia inteiro (feriados, aniversários, viagens do Google Calendar)
-- ganham uma faixa própria acima da grade de horas — não viram blocos de 24h.

alter table public.kairos_eventos
  add column dia_inteiro boolean not null default false;
