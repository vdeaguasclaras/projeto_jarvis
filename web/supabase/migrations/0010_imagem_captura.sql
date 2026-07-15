-- Captura em destaque (proposta C): a captura aceita uma imagem
-- (print, foto de quadro branco), guardada no Storage e vinculada
-- ao item da Inbox ou à tarefa que nascer dela.

alter table public.kairos_inbox add column if not exists imagem_path text;
alter table public.kairos_tarefas add column if not exists imagem_path text;

-- Bucket privado; cada usuário só enxerga a própria pasta (userId/arquivo)
insert into storage.buckets (id, name, public)
  values ('capturas', 'capturas', false)
  on conflict (id) do nothing;

create policy "capturas dono le" on storage.objects for select
  using (bucket_id = 'capturas' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "capturas dono grava" on storage.objects for insert
  with check (bucket_id = 'capturas' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "capturas dono apaga" on storage.objects for delete
  using (bucket_id = 'capturas' and auth.uid()::text = (storage.foldername(name))[1]);
