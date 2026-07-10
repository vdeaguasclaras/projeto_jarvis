# Fase 1 — status (sessão de 09-10/07/2026)

**Produção:** https://projeto-jarvis-seven.vercel.app · deploy contínuo pela `main`
**Banco:** Supabase "mapa-de-sala", tabelas `kairos_*` com RLS (migrações em `web/supabase/migrations/`)

## O que está funcionando (testado pelo Raul em produção)

- Login por link mágico; sessão persistente; logout.
- Captura rápida com parser (`@pessoa #projeto /área`, datas "sexta / 24/07 / dia 24") e **autocompletar** dos seus projetos/áreas/pessoas (Tab completa).
- **Roteamento da captura**: com `#projeto` ou `/área` reconhecidos vira tarefa direto; sem classificação cai na Inbox.
- **Check do dia** = triagem GTD da Inbox real: acionável? → *fazer hoje* (tarefa com prazo hoje) / *já fiz (2 min)* / *delegar* (cria @pessoa, em espera) / *planejar* (destilar); não → referência/nota/incubar (90 dias)/descartar. Inbox zero registra o ritual (+placar).
- **Visão Tarefas**: grupos GTD, concluir em 1 clique, chips com emoji do projeto e prazo (vencidas em destaque).
- **PARA persistente**: criar projetos/áreas/recursos com **emoji** opcional; contador de abertas por projeto.
- Placar do dia e sequência 🔥 reais (tabela `kairos_rituais`).

## Correções da última rodada de feedback do Raul

1. Triagem ganhou **"Fazer hoje"** (tarefa a fazer com prazo hoje); "já fiz agora" ficou explícito que registra como concluída (regra dos 2 min).
2. Captura classificada (#/) não passa mais pela Inbox.
3. Emoji como símbolo de projetos/áreas/recursos (coluna `emoji`, migração 0002).
4. Autocompletar na captura implementado (não existia no app real, só no protótipo).

## O que falta (ordem sugerida — ver CLAUDE.md)

Marco 5 (calendário real + prioridades do dia), revisão semanal, PWA completo, OAuth Google/Microsoft, Fase 2 (sync agendas), importador Todoist.

## Como verificar mudanças

- `cd web && npm run build` (obrigatório antes de push).
- Parser: teste em `npx tsx` (exemplo na sessão anterior); dados: via MCP `execute_sql` assumindo `role authenticated` + `request.jwt.claims` (o proxy bloqueia supabase.co direto).
- Produção: `mcp__Vercel__web_fetch_vercel_url` após o merge.
