# Kairós (projeto Jarvis)

**Kairós** — em grego, o tempo oportuno — é um assistente pessoal de planejamento, organizado a partir do **calendário**, que unifica tarefas, anotações, projetos e acompanhamento de demandas em um único aplicativo web.

> "Penso nesse aplicativo como meu super assistente pessoal, meu Jarvis."

## A ideia em uma frase

A mistura do **poder de organização do Notion**, com as **notas livres e conectadas do Obsidian** e a **simplicidade de lançamento do Todoist** — tudo ancorado em um planner de calendário que integra Google e Outlook.

## Documentos

| Documento | Conteúdo |
|---|---|
| [docs/01-plano-do-produto.md](docs/01-plano-do-produto.md) | Visão, pesquisa de referências, requisitos, modelo conceitual, arquitetura e roadmap |
| [docs/02-decisoes-e-feedback-v1.md](docs/02-decisoes-e-feedback-v1.md) | Decisões fechadas, feedback do v1 → requisitos, modelo de auto-agendamento e candidatos a nome |
| [docs/03-decisoes-e-feedback-v2.md](docs/03-decisoes-e-feedback-v2.md) | Nome aprovado (Kairós), feedback do v2 → v3 e correção do bug do painel |
| [docs/04-decisoes-e-feedback-v3.md](docs/04-decisoes-e-feedback-v3.md) | Feedback do v3 → v4: prioridades, revisão semanal detalhada, mobile repensado, filtros múltiplos, kanban |
| [docs/05-decisoes-e-feedback-v4.md](docs/05-decisoes-e-feedback-v4.md) | Feedback do v4 → v5: correção dos campos livres, projeto ↔ área e o módulo de Notas (Zettelkasten) |
| [docs/06-decisoes-e-feedback-v5.md](docs/06-decisoes-e-feedback-v5.md) | Feedback do v5 → v6 (fechamento do design): notas editáveis, GTD na triagem, gamificação, menu colapsável |
| [docs/07-fase-1-kickoff-tecnico.md](docs/07-fase-1-kickoff-tecnico.md) | Kickoff técnico da Fase 1: stack, schema, marcos de construção |
| [prototipos/prototipo-v1.html](prototipos/prototipo-v1.html) | Protótipo navegável v1 (abra no navegador) |
| [prototipos/prototipo-v2.html](prototipos/prototipo-v2.html) | Protótipo navegável v2 — transições fluidas, check do dia, revisão semanal, visão GTD, grafo, páginas de projeto |
| [prototipos/prototipo-v3.html](prototipos/prototipo-v3.html) | Protótipo navegável v3 — filtros, autocompletar, triagem CODE completa, visão por pessoa, grafo dinâmico, PDF de projeto |
| [prototipos/prototipo-v4.html](prototipos/prototipo-v4.html) | Protótipo navegável v4 — prioridades do dia/semana, revisão semanal em 7 passos, mobile com PARA no menu inferior, filtros múltiplos, kanban, `/área` e datas numéricas |
| [prototipos/prototipo-v5.html](prototipos/prototipo-v5.html) | Protótipo navegável v5 — módulo de Notas (Zettelkasten com agrupamento opcional), projeto ↔ área, campos livres corrigidos |
| [prototipos/prototipo-v6.html](prototipos/prototipo-v6.html) | **Protótipo v6 (final do design)** — fluxo GTD na triagem, notas com título/grupo/pessoas editáveis e `[[` com autocompletar, encaminhamentos → tarefas, placar gameficado, menu colapsável |

## Estado atual

- [x] Levantamento de requisitos e pesquisa de referências (Motion, Briefmatic)
- [x] Plano do produto
- [x] Protótipo de design v1 (navegável, sem código de produção)
- [x] Validação do v1 → decisões e novos requisitos (doc 02)
- [x] Protótipo de design v2
- [x] Validação do v2, nome aprovado (Kairós) e protótipo v3 (doc 03)
- [x] Validação do v3 → protótipo v4 (doc 04)
- [x] Validação do v4 → protótipo v5 com módulo de Notas (doc 05)
- [x] Validação do v5 → protótipo v6, fechamento do design (doc 06)
- [x] Kickoff técnico da Fase 1 (doc 07)
- [x] Fase 1 · Marco 1 — esqueleto do app real em `web/` (Next.js + TypeScript, build ok)
- [ ] Provisionar Supabase (aguarda vaga de projeto gratuito) e Vercel (aguarda permissão do conector)
- [ ] Fase 1 · Marcos 2–7 — auth, captura persistente, tarefas, calendário, check do dia, PWA
