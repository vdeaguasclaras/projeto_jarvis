-- Fase 2 — sync do Google Calendar
-- google_id identifica o evento importado (idempotência do sync).
-- Índice único por usuário; NULLs (eventos locais) não conflitam entre si.

alter table public.kairos_eventos add column google_id text;
create unique index kairos_eventos_google on public.kairos_eventos (user_id, google_id);
