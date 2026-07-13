# Login com Google + Fase 2 (sync Google Calendar) — status (sessão de 12/07/2026)

**Produção:** https://projeto-jarvis-seven.vercel.app · **Banco:** migração 0006 (`kairos_eventos.google_id`)

O Raul criou as credenciais OAuth do Google e ativou o provider no Supabase — isso destravou
o restante do Marco 2 (login social) e a Fase 2 para o Google. Microsoft/Outlook ficam para
quando houver credenciais da Azure (mesmo passo a passo de docs/11).

## O que foi entregue

- **"Entrar com Google"** na barra de login (`signInWithOAuth`), já pedindo o escopo
  `calendar.readonly` com `access_type=offline` + `prompt=consent`.
- **Sync do Google Calendar sem backend**: o app usa o `provider_token` da sessão Supabase e
  chama a API do Google direto do navegador. Janela de −7 a +60 dias, calendário `primary`,
  `singleEvents` (recorrências expandidas), até 250 eventos.
- **Espelho idempotente** em `kairos_eventos`: upsert por `(user_id, google_id)` — índice único
  da migração 0006 (NULLs de eventos locais não conflitam); eventos que somem da janela no Google
  são removidos do espelho. **O Google é a fonte da verdade**: clicar/arrastar um evento `google`
  no Kairós mostra aviso para editar lá (nada duplicado, como manda a regra do produto).
- **Auto-sync ao entrar** (1x por sessão, silencioso) + item **"⇄ Google Agenda"** na sidebar para
  sincronizar na hora. Eventos do Google já aparecem com a cor própria (borda azul) nas grades.
- Eventos de **dia inteiro** ficam de fora por enquanto (não poluem a grade de horas) — entram
  quando houver uma faixa "o dia todo" no layout.

## Limites conhecidos (por design, sem backend)

- O `provider_token` do Google vale ~1h após o login e o Supabase não o renova sozinho.
  Expirou → o botão avisa "entre com Google de novo". Solução definitiva (refresh token em
  Edge Function) fica para quando valer a pena.
- Sync é **unidirecional** (Google → Kairós). Criar evento no Kairós não escreve no Google
  (escopo é readonly, decisão consciente da Fase 2).

## Checklist do Raul para o primeiro login (se algo falhar)

1. Supabase → **Authentication → URL Configuration**: `Site URL` = `https://projeto-jarvis-seven.vercel.app`
   (sem isso o Google devolve para localhost).
2. Google Cloud → **APIs & Services → Library → Google Calendar API → Enable**
   (sem isso o sync responde 403 e o app avisa).
3. Consent screen em modo Testing: seu e-mail precisa estar em **Test users**.

## Como verificar

- `cd web && npm run build` ✓ · upsert por `(user_id, google_id)` sob RLS: 2 rodadas → 1 linha,
  título atualizado ✓ (transação com rollback).
- O fluxo OAuth real só o Raul consegue testar (o ambiente bloqueia supabase.co/googleapis).

## Próximos passos

1. Teste real do login Google + sync pelo Raul (checklist acima).
2. Páginas PARA (projeto/área/recurso com objetivos, tarefas e notas vinculadas).
3. OAuth Microsoft + Outlook (Fase 2 completa), quando o Raul criar as credenciais na Azure.
