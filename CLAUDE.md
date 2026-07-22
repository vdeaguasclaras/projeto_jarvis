# Kairós (projeto_jarvis) — contexto para o Claude

Planner pessoal do Raul, centrado no calendário: PARA (Forte) + GTD (Allen) + CODE + Zettelkasten.
Nome aprovado: **Kairós** ("o tempo oportuno"). Todo o design foi validado em 6 protótipos; o app real está na Fase 1.

## Idioma e estilo

- **Tudo em pt-BR**: conversa, commits, código de UI, docs. Termos das metodologias mantidos (Despacho — novo nome do check do dia —, triagem, incubar, destilar).
- Design tokens e interações: a especificação é o **handoff do redesign** em `prototipos/redesign-2026-07/` (README + TOKENS.md + DARK-MODE.md + canvas `design/kairos-mobile.dc.html`) — substituiu o protótipo v6. Divergências devem ser decididas, não acidentais.

## Estrutura

- `docs/01-07` — plano do produto, decisões de cada rodada de design, kickoff técnico (schema, marcos).
- `docs/08+` — status por sessão de desenvolvimento (ler o mais recente antes de continuar).
- `prototipos/` — protótipos HTML v1–v6 (histórico) e `redesign-2026-07/` (handoff vigente).
- `web/` — app Next.js 15 + TypeScript + Tailwind 4 + Supabase. `npm run build` precisa passar antes de push.

## Infraestrutura (decisões vigentes)

- **Supabase**: projeto `mapa-de-sala` (id `budjzwlccrnxdnkaqtko`, região sa-east-1). As tabelas `jim_*` do app antigo do Jim foram **removidas em 22/07/2026** (migração 0012; backup entregue ao Raul) — hoje só existem as **`kairos_*`**, todas com RLS "dono" (`auth.uid() = user_id`). Migrações versionadas em `web/supabase/migrations/` e aplicadas via MCP `apply_migration`. No storage restam os buckets `sumulas` e `cartoes-resposta` (do Jim, já privados e sem políticas; o Raul vai apagá-los pelo painel — SQL não apaga storage e o proxy bloqueia a API).
- **Vercel**: projeto `projeto-jarvis` (team `team_zwdRohlmXrxBKP3dokznhfe3`), Root Directory `web`, produção em **https://projeto-jarvis-seven.vercel.app**. Deploy contínuo: merge na `main` publica. O Framework Preset do painel está "Other" — é o `web/vercel.json` (`"framework": "nextjs"`) que faz funcionar; **não remover**.
- **Auth**: link mágico por e-mail + **Google OAuth** (o Raul criou as credenciais; login já pede o escopo `calendar.readonly`). Chave anon pública em `web/.env.production` (por design; segurança é o RLS). Microsoft/Azure ainda sem credenciais.

## Armadilhas conhecidas deste ambiente

- O proxy da sessão **bloqueia** `*.supabase.co` e `*.vercel.app` — teste o banco via MCP (`execute_sql`, assumindo `role authenticated` + `request.jwt.claims` para RLS real) e a produção via `mcp__Vercel__web_fetch_vercel_url`.
- O fluxo de publicação: commit no branch `claude/...` → push → PR → merge (o Raul autorizou eu mesmo mergear para publicar).
- O proxy também bloqueia o **storage** do Supabase — arquivos de buckets não podem ser baixados desta sessão (só metadados via `execute_sql` em `storage.objects`).

## Versionamento (regra do Raul, 21/07)

- Versão visível no app (menu do avatar e rodapé dos Espaços), fonte única em `web/src/lib/versao.ts`
  (espelhar no `version` do `web/package.json`). Formato **0.X.Y**: mudança de **frontend soma no X**;
  de **backend** (migração, Edge Function, storage) **soma no Y**. A 0.2.0 = tudo até a Etapa A do
  redesign. **Toda sessão publicada precisa atualizar a versão.**

## Regras de produto que o Raul definiu

- Captura com `#projeto` ou `/área` reconhecidos vira tarefa **direto** (Inbox é só para o não classificado).
- Na triagem GTD: "acionável hoje" = tarefa a fazer com prazo hoje; "já fiz (2 min)" = registra concluída.
- O Kairós **propõe, o usuário decide** (sugestões pré-selecionadas e editáveis) — vale para o futuro auto-agendamento.
- Agrupar notas é opcional (Zettelkasten); arquivos são linkados, nunca duplicados; nota nasce do evento.

## Próximos passos (na ordem)

**O redesign de 2026-07 está COMPLETO** (etapas A–J de `docs/20-plano-redesign.md`, v0.11.0 —
ver `docs/28`). A fila volta a ser a do produto:

1. Renovação do token Google sem relogar (Edge Function), Web Push com app fechado,
   gamificação plena / auto-agendamento sugerido. (As políticas `jim_*` deixaram de ser
   pendência: tabelas removidas em 22/07 — migração 0012.)
2. **OAuth Microsoft/Outlook: ADIADO por decisão do Raul (14/07)** — não implementar por ora.

Feitos: Marcos 1–7 completos (login Google incluído), revisão semanal (wizard), Mês/Ano, importador do
Todoist (migração 0004), Fase 3 completa (Notas + Grafo, migração 0005), **Fase 2 Google** (sync de
TODAS as agendas visíveis, espelho idempotente `google_id = agenda/evento`, migração 0006; Google é a
fonte da verdade; `provider_token` vale ~1h por login) e a **1ª rodada de refino do uso real** (docs/14):
painel lateral de evento, check do dia com escolha de item + agendamento do dia, captura com data/hora
vira tarefa agendada, filtros nas Tarefas, recorrência (migração 0007), rolagem corrigida. **2ª rodada**
(docs/15): check do dia com dia/hora/grupo por tarefa, eventos de dia inteiro (migração 0008, faixa
"o dia todo"), **páginas PARA** (descrição/objetivo editáveis, progresso, tarefas, notas, arquivar,
lista no celular). **3ª rodada** (docs/16): painel lateral da tarefa em tudo (padrão Notion), coluna
"sem horário" no Dia, navegação entre dias (Semana→Dia), prioridades acionáveis + avulsas (migração
0009), projeto↔áreas N:N (migração 0011; a área lista as tarefas dos projetos com chip), ícone
com colagem livre, sidebar expansível, captura com texto
persistente + @pessoa→responsável, duração padrão 30 min, atalho "c", grafo com PARA completo.