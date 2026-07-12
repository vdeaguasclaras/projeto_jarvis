-- Fase 3 — Notas (Zettelkasten): a nota pode nascer de um evento do calendário
-- (regra do produto: "nota nasce do evento"; o vínculo é metadado, nada é duplicado).

alter table public.kairos_notas
  add column evento_id uuid references public.kairos_eventos (id) on delete set null;
