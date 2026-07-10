# Kairós — app (Fase 1)

App web do Kairós (Next.js + TypeScript + Tailwind), seguindo a especificação visual do
`../prototipos/prototipo-v6.html` e o plano do `../docs/07-fase-1-kickoff-tecnico.md`.

## Rodar localmente

```bash
npm install
npm run dev   # http://localhost:3000
```

## Estado (marcos da Fase 1)

- [x] **Marco 1 — Esqueleto**: shell (sidebar PARA colapsável, topbar com visões e captura),
      visão Dia com grade de horas e linha do agora, parser da captura (`@ # /`, datas), tokens de design, PWA manifest.
- [ ] Marco 2 — Auth (Supabase: Google/Microsoft, RLS)
- [ ] Marco 3 — Captura + Inbox persistentes (offline-first)
- [ ] Marco 4 — Tarefas + PARA (CRUD, filtros, kanban)
- [ ] Marco 5 — Calendário local completo (semana/mês/ano, arrastar tarefa)
- [ ] Marco 6 — Check do dia (fluxo GTD/CODE com placar)
- [ ] Marco 7 — PWA completo (instalação, notificação do check)

## Banco (Supabase)

Schema inicial em `supabase/migrations/`. Variáveis em `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
