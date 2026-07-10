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

1. **Marco 5** — calendário real: `kairos_eventos` no Dia/Semana, arrastar tarefa para o dia, prioridades do dia persistentes.
2. **Revisão semanal** (domingo) com placar e decisões — espelhar o protótipo v6.
3. **Marco 7** — PWA completo (service worker, notificação do check do dia).
4. **OAuth Google/Microsoft** (Marco 2 restante) e **Fase 2** — sync Google Calendar/Outlook.
5. **Fase 5** — importador do Todoist (conector MCP do Todoist já autorizado nesta conta).
