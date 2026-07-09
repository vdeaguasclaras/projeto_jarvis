# Fase 1 — Kickoff técnico do Kairós

**Objetivo da fase:** um app real, usável no dia a dia, que substitua o Todoist: login, calendário (eventos locais), captura rápida, tarefas, PARA e Inbox com check do dia. Critério de sucesso: **passar um dia inteiro de trabalho sem abrir o Todoist.**

## Stack (decidida no plano, confirmada nos protótipos)

| Camada | Escolha |
|---|---|
| App | Next.js (App Router) + TypeScript, PWA instalável (Windows 11 e Android) |
| Estilo | Tailwind CSS com os design tokens dos protótipos (paleta verde-petróleo/âmbar, temas claro/escuro) |
| Banco/Auth | Supabase — Postgres com Row-Level Security, login Google e Microsoft (OAuth) |
| Hospedagem | Vercel (deploy contínuo, HTTPS) |
| Offline | Cache local (IndexedDB) para captura instantânea; sync quando online |

## Modelo de dados (rascunho do schema)

```sql
-- Tudo com user_id + RLS (cada linha pertence a um usuário)
containers  (id, user_id, kind check (kind in ('projeto','area','recurso')),
             nome, descricao, objetivo, prazo, status, area_id nullable, arquivado_em)
tarefas     (id, user_id, titulo, descricao, container_id, responsavel_id,
             prazo, duracao_min, prioridade, status, agendada_inicio/fim,
             nota_origem_id, criada_em, concluida_em, incubada_ate)
eventos     (id, user_id, titulo, inicio, fim, origem check ('local','google','outlook'),
             origem_id_externo, container_id, nota_id)
notas       (id, user_id, titulo, md, container_id nullable, criada_em, atualizada_em)
nota_links  (nota_id, alvo_tipo check ('nota','projeto','area','recurso','pessoa'), alvo_id)  -- backlinks
pessoas     (id, user_id, nome)                       -- @menções, sem conta própria
inbox       (id, user_id, texto, origem, criado_em, incubada_ate, triado_em)
rituais     (id, user_id, tipo check ('check_dia','revisao_semana'), data, placar jsonb)  -- gamificação
```

## Marcos da Fase 1 (ordem de construção)

1. **Esqueleto** — Next.js + Tailwind com os tokens do protótipo; layout (sidebar PARA colapsável, topbar, visões); deploy na Vercel desde o dia 1.
2. **Auth** — Supabase com Google/Microsoft; RLS em tudo.
3. **Captura + Inbox** — caixa rápida com parser (`@pessoa #projeto /área`, datas "sexta / 24/07 / dia 24"), offline-first.
4. **Tarefas + PARA** — CRUD de projetos/áreas/recursos/arquivo, visão Tarefas (dia, filtros, kanban).
5. **Calendário local** — visões Dia/Semana/Mês/Ano, arrastar tarefa para o dia; prioridades do dia/semana.
6. **Check do dia** — fluxo GTD/CODE do protótipo v6, com placar e sequência (dados reais na tabela `rituais`).
7. **PWA** — manifest, ícone, instalação, notificação local do check do dia.

Fases seguintes (já especificadas nos protótipos): 2 — sync Google/Outlook; 3 — notas Zettelkasten completas; 4 — agenda assistida; 5 — importador do Todoist (a API traz projetos, tarefas, prazos e etiquetas).

## Referência de design

O protótipo v6 (`prototipos/prototipo-v6.html`) é a **especificação visual e de interação** da fase: tokens de cor, tipografia, os 7 modos de visão, os rituais e a triagem. Divergências devem ser decididas, não acidentais.
