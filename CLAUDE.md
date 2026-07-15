# Kairós (projeto_jarvis) — contexto para o Claude

Planner pessoal do Raul, centrado no calendário: PARA (Forte) + GTD (Allen) + CODE + Zettelkasten.
Nome aprovado: **Kairós** ("o tempo oportuno"). Todo o design foi validado em 6 protótipos; o app real está na Fase 1.

## Idioma e estilo

- **Tudo em pt-BR**: conversa, commits, código de UI, docs. Termos das metodologias mantidos (check do dia, triagem, incubar, destilar).
- Design tokens e interações: a especificação é `prototipos/prototipo-v6.html` — divergências devem ser decididas, não acidentais.

## Estrutura

- `docs/01-07` — plano do produto, decisões de cada rodada de design, kickoff técnico (schema, marcos).
- `docs/08+` — status por sessão de desenvolvimento (ler o mais recente antes de continuar).
- `prototipos/` — protótipos HTML v1–v6 (v6 = final).
- `web/` — app Next.js 15 + TypeScript + Tailwind 4 + Supabase. `npm run build` precisa passar antes de push.

## Infraestrutura (decisões vigentes)

- **Supabase**: projeto `mapa-de-sala` (id `budjzwlccrnxdnkaqtko`, região sa-east-1) — compartilhado com outro app do Raul (tabelas `jim_*`). As nossas são **`kairos_*`**, todas com RLS "dono" (`auth.uid() = user_id`). Migrações versionadas em `web/supabase/migrations/` e aplicadas via MCP `apply_migration`. Decisão: migrar para projeto próprio quando o Raul pagar/limpar o plano.
- **Vercel**: projeto `projeto-jarvis` (team `team_zwdRohlmXrxBKP3dokznhfe3`), Root Directory `web`, produção em **https://projeto-jarvis-seven.vercel.app**. Deploy contínuo: merge na `main` publica. O Framework Preset do painel está "Other" — é o `web/vercel.json` (`"framework": "nextjs"`) que faz funcionar; **não remover**.
- **Auth**: link mágico por e-mail + **Google OAuth** (o Raul criou as credenciais; login já pede o escopo `calendar.readonly`). Chave anon pública em `web/.env.production` (por design; segurança é o RLS). Microsoft/Azure ainda sem credenciais.

## Armadilhas conhecidas deste ambiente

- O proxy da sessão **bloqueia** `*.supabase.co` e `*.vercel.app` — teste o banco via MCP (`execute_sql`, assumindo `role authenticated` + `request.jwt.claims` para RLS real) e a produção via `mcp__Vercel__web_fetch_vercel_url`.
- O fluxo de publicação: commit no branch `claude/...` → push → PR → merge (o Raul autorizou eu mesmo mergear para publicar).
- ⚠️ As tabelas `jim_*` têm políticas permissivas (qualquer autenticado pode tudo). Enquanto só o Raul loga no Kairós, ok; **antes de compartilhar o app, apertar essas políticas**.

## Regras de produto que o Raul definiu

- Captura com `#projeto` ou `/área` reconhecidos vira tarefa **direto** (Inbox é só para o não classificado).
- Na triagem GTD: "acionável hoje" = tarefa a fazer com prazo hoje; "já fiz (2 min)" = registra concluída.
- O Kairós **propõe, o usuário decide** (sugestões pré-selecionadas e editáveis) — vale para o futuro auto-agendamento.
- Agrupar notas é opcional (Zettelkasten); arquivos são linkados, nunca duplicados; nota nasce do evento.

## Próximos passos (na ordem)

1. Teste do Raul no topo novo (docs/17): check na sidebar (anel), FAB de captura com imagem
   (Storage bucket `capturas`, migração 0010), faixa compacta no celular.
2. Candidatos: renovação do token Google sem relogar (Edge Function), Web Push com app fechado,
   apertar políticas `jim_*` antes de compartilhar, gamificação plena / auto-agendamento sugerido.
3. **OAuth Microsoft/Outlook: ADIADO por decisão do Raul (14/07)** — não implementar por ora.

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
0009), projeto↔área exposto, ícone com colagem livre, sidebar expansível, captura com texto
persistente + @pessoa→responsável, duração padrão 30 min, atalho "c", grafo com PARA completo.
