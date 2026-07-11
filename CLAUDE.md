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
- **Auth**: link mágico por e-mail (Supabase). Chave anon pública em `web/.env.production` (por design; segurança é o RLS). OAuth Google/Microsoft ainda não configurado (precisa de credenciais que só o Raul pode criar).

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

1. **OAuth Google/Microsoft** — bloqueado nas credenciais que só o Raul cria (instruções em docs/11);
   depois botões de login e **Fase 2** — sync Google Calendar/Outlook.
2. **Fase 3** — Notas (Zettelkasten) e Grafo.
3. Ano do calendário, se o Raul sentir falta.

Feitos: Marcos 1–7 (exceto OAuth), revisão semanal, Mês e o **importador do Todoist** (executado —
idempotente via coluna `todoist_id`, migração 0004; ver docs/09–11).
