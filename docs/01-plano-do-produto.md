# Projeto Jarvis — Plano do Produto

**Versão:** 1.0 · **Data:** 09/07/2026 · **Status:** proposta para validação

---

## 1. Visão

Um único aplicativo web que substitui o uso fragmentado de Todoist + Google Calendar + Outlook + Obsidian + Notion, organizado **a partir do calendário** (como um planner), estruturado pela metodologia **PARA** (Tiago Forte) e com anotações conectadas no estilo **Zettelkasten** (Niklas Luhmann).

O problema central que ele resolve: hoje o fluxo de trabalho está espalhado em 4–5 ferramentas, e as que exigem mais disciplina (Notion) acabam abandonadas. O Jarvis inverte essa lógica — **o dia de trabalho é o ponto de entrada**, e projetos, tarefas e notas orbitam ao redor dele.

### Princípios de produto

1. **O calendário é a espinha dorsal.** Toda tela parte do tempo: dia, semana, mês e ano (calendário linear).
2. **Capturar tem que ser instantâneo.** Uma caixa de captura rápida sempre visível, com linguagem natural ("parecer do contrato sexta 14h"), como no Todoist.
3. **Organizar é opcional, não obrigatório.** O PARA organiza o que importa; o que não for classificado não vira dívida — cai numa Inbox e pode ser arquivado sem culpa. (O motivo do Notion ter sido abandonado é que ele cobra estrutura antes de entregar valor.)
4. **Notas são cidadãs de primeira classe.** Qualquer nota conecta a outra com `[[links]]`, e conecta a eventos, tarefas e projetos. O grafo emerge do uso, não de burocracia.
5. **Minimalista, bonito e rápido.** Menos telas, menos botões, mais teclado. Design silencioso.
6. **Seguro por padrão.** OAuth para integrações, dados isolados por usuário, criptografia em trânsito e em repouso.

---

## 2. Pesquisa de referências

### Motion (usemotion.com)

Plataforma de produtividade "IA-first" centrada no calendário. O que interessa ao Jarvis:

- **Agendamento automático de tarefas:** a IA aloca tarefas nos espaços livres do calendário com base em prazo, prioridade e duração — e replaneja sozinha quando algo não é feito. É o recurso mais elogiado: reduz a "fadiga de decisão" de montar o dia.
- **Calendário unificado:** integra Google Calendar e Microsoft Outlook numa única visão — exatamente a necessidade declarada do projeto.
- **Múltiplas visões de projeto:** lista, kanban, timeline e Gantt sobre os mesmos dados.
- **IA de reuniões:** gravação/transcrição/resumo com extração de itens de ação que viram tarefas.
- **Críticas recorrentes:** curva de aprendizado íngreme e preço alto (US$ 19–34/mês). Lição: o Jarvis deve entregar valor já no primeiro dia, sem exigir configuração.

### Briefmatic (briefmatic.com)

Gerenciador de tarefas que **captura demandas automaticamente** do ecossistema Google. O que interessa:

- **Captura passiva:** e-mails com estrela no Gmail, @menções em Google Docs e itens do Google Tasks viram tarefas automaticamente, com link de volta à origem. Resolve o "dropar bola" de demandas que chegam por canais diversos.
- **Agendar arrastando:** arrastar uma tarefa para um espaço livre do dia no calendário (task ↔ time blocking).
- **Visões leves:** lista, kanban e calendário — sem impor metodologia.

### Síntese — o que o Jarvis herda de cada referência

| Ferramenta | O que herdar | O que evitar |
|---|---|---|
| **Motion** | Calendário como centro; unificação Google+Outlook; auto-agendamento de tarefas (fase posterior) | Complexidade de onboarding; excesso de recursos de time |
| **Briefmatic** | Captura passiva de demandas (e-mail → tarefa); arrastar tarefa para o calendário | Foco exclusivo em Google |
| **Todoist** | Captura em linguagem natural em 1 segundo; leveza | Falta de contexto/notas |
| **Obsidian** | Notas em Markdown, `[[wikilinks]]`, backlinks, grafo | Fricção de sincronização e de mobile |
| **Notion** | Bancos de dados de projetos, propriedades, visões | Estrutura obrigatória que vira dívida |

---

## 3. Requisitos organizados

### 3.1 Funcionais — MVP

- **RF1. Visões de calendário:** Dia, Semana, Mês e Ano (calendário linear, 12 meses em linhas). Navegação por teclado e toque.
- **RF2. Captura rápida:** caixa única, sempre acessível (atalho global), com interpretação de linguagem natural para data/hora/projeto ("reunião equipe seg 10h #ProjetoX").
- **RF3. Tarefas:** título, descrição, prazo, duração estimada, prioridade, projeto/área, status. Visões em lista e kanban. Arrastar tarefa para o calendário cria um bloco de tempo.
- **RF4. Estrutura PARA:** navegação lateral fixa com **Projetos** (objetivo + prazo), **Áreas** (responsabilidades contínuas), **Recursos** (temas de interesse) e **Arquivo**. Arquivar é uma ação de 1 clique em qualquer item.
- **RF5. Notas Zettelkasten:** notas em Markdown com `[[links]]` bidirecionais, backlinks automáticos, e vínculo opcional a eventos, tarefas, projetos e áreas. Nota de reunião nasce do próprio evento do calendário.
- **RF6. Integração Google Calendar:** leitura e escrita de eventos via OAuth (Google Calendar API).
- **RF7. Integração Outlook:** leitura e escrita de eventos via OAuth (Microsoft Graph API).
- **RF8. Inbox:** tudo que é capturado e não classificado fica na Inbox, com triagem rápida (enviar para Projeto/Área/Recurso/Arquivo).

### 3.2 Funcionais — fases seguintes

- **RF9. Captura passiva** (estilo Briefmatic): e-mails marcados no Gmail/Outlook viram itens na Inbox.
- **RF10. Auto-agendamento** (estilo Motion): sugerir horários para tarefas com prazo, replanejando quando o dia muda.
- **RF11. Grafo de notas:** visualização do grafo de conexões entre notas.
- **RF12. Revisão semanal guiada:** ritual de revisão PARA (projetos parados, prazos, inbox zero).
- **RF13. Assistente "Jarvis":** camada de IA para resumo do dia, extração de ações de notas de reunião e replanejamento por comando de voz/texto.

### 3.3 Não funcionais

- **RNF1. Plataformas:** web app responsivo (PWA) — funciona no Windows 11 (navegador/atalho instalável) e Android (instalável, com suporte offline básico). Um só código, as duas plataformas.
- **RNF2. Desempenho:** captura e troca de visões em menos de 100 ms percebidos; dados locais em cache.
- **RNF3. Segurança:** OAuth 2.0 (Google e Microsoft) sem guardar senhas; tokens criptografados; isolamento por usuário no banco (row-level security); HTTPS; backups.
- **RNF4. Privacidade:** os dados são do usuário — exportação completa (Markdown + JSON) a qualquer momento.
- **RNF5. Design:** minimalista, tipografia cuidada, tema claro e escuro.

---

## 4. Modelo conceitual

```
                    ┌──────────── CALENDÁRIO (espinha dorsal) ────────────┐
                    │  Dia · Semana · Mês · Ano (linear)                  │
                    │  eventos Google + Outlook + blocos de tarefas       │
                    └──────────────────────┬──────────────────────────────┘
                                           │
        ┌──────────────┬───────────────────┼───────────────────┬──────────────┐
        ▼              ▼                   ▼                   ▼              ▼
    PROJETOS        ÁREAS             TAREFAS              NOTAS          INBOX
  (objetivo com   (responsabi-     (o que fazer,       (Markdown com   (capturas não
   prazo; ativo    lidades sem      com prazo e         [[links]] e     classificadas)
   ou arquivado)   prazo)           duração)            backlinks)
        │              │                   │                   │
        └──────────────┴───────── RECURSOS ┴────── ARQUIVO ────┘
                       (referências por tema)   (tudo que concluiu/esfriou)
```

**Entidades e relações principais:**

- `Evento` — nasce local ou sincronizado (Google/Outlook). Pode ter uma `Nota` vinculada (nota de reunião) e pertencer a um `Projeto`/`Área`.
- `Tarefa` — pertence a no máximo um `Projeto` ou `Área`. Pode ser agendada como bloco no calendário.
- `Nota` — Markdown; liga-se a outras notas (`[[link]]`), a eventos, tarefas, projetos, áreas e recursos. Backlinks calculados automaticamente.
- `Projeto` — tem objetivo e prazo; ao concluir, vai para o `Arquivo` com tudo que contém.
- `Área` e `Recurso` — contêineres contínuos, sem prazo.
- Tudo é arquivável e recuperável (o Arquivo é uma dimensão, não uma lixeira).

---

## 5. Arquitetura proposta

**Formato: aplicativo web (PWA)** — confirma a intuição do briefing. Um único código atende Windows 11 (instalável pelo Edge/Chrome, ícone na barra de tarefas) e Android (instalável pela tela inicial, com offline básico e notificações). Evita as lojas de app e mantém o custo de manutenção baixo.

| Camada | Proposta | Por quê |
|---|---|---|
| Front-end | **Next.js (React) + TypeScript** | Ecossistema maduro, PWA de primeira classe, renderização rápida |
| Estilo | **Tailwind CSS** + design tokens próprios | Consistência do design minimalista, temas claro/escuro |
| Estado local / offline | **IndexedDB (cache local) + sincronização** | Captura instantânea mesmo offline |
| Back-end / banco | **Supabase (Postgres + Auth + Row-Level Security)** | Auth com Google/Microsoft pronta, RLS garante isolamento por usuário, tempo real para sync entre PC e celular |
| Integrações | **Google Calendar API** e **Microsoft Graph API** via OAuth 2.0 | Leitura/escrita de eventos das duas contas |
| Hospedagem | **Vercel** | Deploy contínuo, HTTPS por padrão |
| Editor de notas | Markdown com extensão de `[[wikilink]]` (ex.: TipTap/CodeMirror) | Experiência tipo Obsidian no navegador |

**Segurança:** OAuth 2.0 com escopos mínimos; tokens de acesso criptografados no servidor; RLS no Postgres (cada linha pertence a um usuário); HTTPS em tudo; sem rastreadores de terceiros.

---

## 6. Design

**Direção:** planner silencioso — superfícies neutras com leve viés frio, um único acento (verde-petróleo) para ação e seleção, âmbar reservado para "hoje/agora". Tipografia de interface em grotesca do sistema; notas em serifada, para separar "operar" de "ler/escrever". Sem gradientes, sem ruído.

**Protótipo v1** (`prototipos/prototipo-v1.html`): navegável no navegador, cobre —

- As 4 visões do calendário (Dia, Semana, Mês, Ano linear)
- Barra lateral PARA com Inbox
- Captura rápida com linguagem natural (simulada)
- Painel de detalhe com nota de reunião, `[[links]]` e backlinks
- Tema claro/escuro e layout responsivo (desktop e celular)

---

## 7. Roadmap

| Fase | Entrega | Conteúdo |
|---|---|---|
| **0 — Design** *(atual)* | Protótipos validados | Protótipo v1 → feedback → protótipo v2 de alta fidelidade |
| **1 — Planner básico** | App usável no dia a dia | Calendário 4 visões (eventos locais), captura rápida, tarefas, PARA, Inbox. Login. |
| **2 — Integrações** | Calendário unificado | Sync Google Calendar + Outlook (leitura/escrita), arrastar tarefa para o calendário |
| **3 — Notas conectadas** | Zettelkasten | Editor Markdown, `[[links]]`, backlinks, notas de reunião a partir de eventos, grafo |
| **4 — Jarvis** | Assistente | Captura passiva de e-mails, auto-agendamento, resumo do dia, revisão semanal guiada |
| **5 — Migração** | Adeus às 5 ferramentas | Importadores: Todoist (tarefas), Obsidian (notas .md), Notion (projetos) |

**Critério de sucesso da fase 1:** conseguir passar um dia inteiro de trabalho sem abrir o Todoist.

---

## 8. Decisões em aberto (para discutirmos)

1. **Nome:** "Jarvis" é o codinome do projeto — mantemos?
2. **Auto-agendamento (Motion-style) é essencial ou "nice to have"?** Ele define bastante a arquitetura do motor de calendário.
3. **Migração:** quais dados históricos importam? (Todoist inteiro? Vault do Obsidian completo?)
4. **Uso individual ou futuramente compartilhado** (delegar tarefas, agendas de equipe)?

---

### Fontes da pesquisa

- Motion: [usemotion.com](https://www.usemotion.com/) · [Efficient App — Motion review](https://efficient.app/apps/motion) · [Ellie — Motion App Review 2026](https://ellieplanner.com/comparisons/motion-app-review) · [Kristian Larsen — Motion Review](https://www.kristian-larsen.com/reviews/motion-review/)
- Briefmatic: [briefmatic.com](https://briefmatic.com/) · [Integração Google Calendar](https://briefmatic.com/integration/google-calendar) · [Integração Gmail](https://briefmatic.com/integration/gmail) · [Software Advice — Briefmatic](https://www.softwareadvice.com/productivity/briefmatic-profile/)
- Metodologias: PARA (Tiago Forte, *Building a Second Brain*) e Zettelkasten (Niklas Luhmann)
