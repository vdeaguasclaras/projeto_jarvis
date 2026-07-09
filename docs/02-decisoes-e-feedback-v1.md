# Decisões e feedback sobre o protótipo v1

**Data:** 09/07/2026 · **Origem:** revisão do protótipo v1 pelo Raul

---

## 1. Decisões fechadas (seção 8 do plano)

| Tema | Decisão |
|---|---|
| **Nome** | "Jarvis" era só inspiração. Novo nome em discussão — candidatos na seção 4 abaixo. Protótipo v2 usa **Kairós** como título provisório. |
| **Auto-agendamento** | Aprovado como conceito. Modelo detalhado na seção 3 abaixo — versão **assistida** (o app propõe, o usuário confirma). |
| **Migração** | Importar o **Todoist inteiro**. Obsidian **não** — as notas recomeçam do zero. Notion segue em avaliação (fase 5). |
| **Uso** | Individual primeiro; arquitetura não deve impedir expansão futura para equipe (por isso as @menções já entram como pessoas nomeadas, mesmo sem login delas). |

---

## 2. Feedback do protótipo v1 → o que virou requisito

| # | Pedido | Requisito | Onde aparece |
|---|---|---|---|
| 1 | Design mais fluido, transições inovadoras | **RNF6 — Movimento:** transições coreografadas entre visões (o calendário "escala" de dia→semana→mês→ano), painéis com física suave, micro-interações. Respeita `prefers-reduced-motion`. | Protótipo v2 |
| 2 | Alerta para revisar a Inbox (começo ou fim do dia) | **RF14 — Check do dia:** ritual diário guiado que abre a Inbox item a item para triagem rápida. Configurável (manhã/noite) e com lembrete/notificação. | Protótipo v2 |
| 3 | Revisão semanal aos domingos | **RF12 (já previsto, agora detalhado):** aos domingos o app provoca a revisão da semana — vencidos, semana que entra, projetos parados, Inbox zero. | Protótipo v2 |
| 4 | Ideias não acionadas reaparecem a cada 2–3 meses | **RF15 — Incubação (resurfacing):** na triagem, a opção "Incubar" agenda o retorno do item à Inbox após um período (padrão 60–90 dias, configurável por item). Nada se perde por não ter virado ação. | Protótipo v2 (triagem) |
| 5 | Captura seguindo o CODE (Tiago Forte) | **RF16 — Fluxo CODE:** Capturar (caixa rápida) → Organizar (triagem PARA no check do dia) → Destilar (destaques na nota) → Expressar (páginas de projeto e revisões). O fluxo de triagem é rotulado por essas etapas. | Protótipo v2 |
| 6 | Visão só de tarefas, estilo GTD | **RF17 — Visão Tarefas:** lista objetiva agrupada em Hoje / Próximas ações / Em espera / Algum dia, com conclusão em 1 clique e sem ruído de calendário. | Protótipo v2 (5ª visão) |
| 7 | Grafo de relações (estilo Obsidian/Graphify) | **RF11 (já previsto, antecipado):** grafo interativo de notas, projetos e pessoas, com cores por tipo. | Protótipo v2 |
| 8 | @menções de pessoas em tarefas, eventos e notas | **RF18 — Pessoas:** `@nome` cria/referencia uma pessoa; pessoas têm página própria com tudo que as menciona (tarefas delegadas, reuniões, notas). Não exige conta — são registros seus. | Protótipo v2 (captura e detalhe) |
| 9 | Não há como criar Projetos/Áreas/Recursos | **RF19 — Criação inline:** botão "+" em cada grupo da barra lateral, com formulário mínimo (nome → pronto; o resto é opcional). | Protótipo v2 |
| 10 | Projetos e Áreas como páginas (estilo Notion) | **RF20 — Página de projeto/área:** descrição, objetivo, prazo (projetos), status, tarefas vinculadas, notas vinculadas, pessoas envolvidas. | Protótipo v2 |
| 11 | Ano linear com barras contínuas de duração | **RF21 — Linha do tempo:** segundo modo da visão Ano — barras horizontais com a duração de projetos e ações longas ao longo dos meses (Gantt leve). | Protótipo v2 |
| 12 | Linkar arquivos e embedar fotos/vídeos em notas | **RF22 — Anexos leves:** link de arquivo (Google Drive/OneDrive) como chip com pré-visualização de nome/ícone, sem duplicar o arquivo; embeds de imagem e vídeo dentro da nota (Markdown `![...]`). | Protótipo v2 (nota de exemplo) |

---

## 3. Como funcionaria o auto-agendamento

O modelo proposto é o **agendamento assistido** (o do Motion é totalmente automático — poderoso, mas é a principal fonte da curva de aprendizado que queremos evitar).

**O que a tarefa precisa ter:** duração estimada (ex.: 1h30), prazo e prioridade. Sem duração, o app sugere uma com base em tarefas parecidas.

**O ciclo:**

1. **Você captura** — "parecer do contrato sexta 14h" já nasce agendado; "escrever relatório 3h até sexta" nasce *agendável*.
2. **O motor procura espaço** — olha os calendários unificados (Google + Outlook + blocos já existentes), suas janelas de trabalho (ex.: 8h–19h, sem sábado/domingo) e regras suas (ex.: "foco só de manhã", "atendimentos só à tarde").
3. **Ele propõe, você confirma** — a tarefa aparece no dia como bloco tracejado ("proposto"). Um toque aceita, arrastar muda, ignorar mantém na lista.
4. **Replanejamento** — se o dia atropela (reunião nova, tarefa não concluída), os blocos propostos ainda não aceitos se reorganizam sozinhos; os aceitos pedem confirmação para mover. Nada é remarcado às escondidas.
5. **Proteção do prazo** — se o motor não encontra espaço antes do prazo, ele avisa *antes* ("Não há espaço para 'Relatório' antes de sexta — mover algo?"), que é o valor real do recurso: transformar prazo estourado em decisão antecipada.

**Fases:** na fase 1–2 entra só o arrastar-para-agendar manual; o motor de proposta entra na fase 4, quando já houver dados de uso (durações reais, janelas preferidas).

---

## 4. Candidatos a nome

Critérios: não ser nome próprio de assistente, carregar o conceito (tempo, estratégia, conexão), funcionar em português, domínio/registro viável.

| Nome | Origem | Por que combina |
|---|---|---|
| **Kairós** | Grego *kairos* — o tempo oportuno, qualitativo (em oposição a *chronos*, o tempo do relógio) | É exatamente a tese do app: não mostrar as horas, mas o momento certo de cada coisa. Forte, curto, sonoro em PT. |
| **Strategos** | Grego — o general, a arte de conduzir o todo | Sugestão original do Raul. Evoca comando e visão de conjunto; um pouco mais "militar" que "pessoal". |
| **Praxis** | Grego — ação refletida, teoria posta em prática | Conversa com GTD e CODE (capturar → agir). Abstrato, elegante. |
| **Telos** | Grego — propósito, fim para o qual algo tende | Bom para a camada de projetos/objetivos; menos ligado a tempo/calendário. |
| **Órbita** | Português direto | Tudo (tarefas, notas, projetos) orbita o calendário — é a arquitetura do app virada em metáfora. Acessível, não pretensioso. |
| **Prumo** | Português — instrumento de alinhamento vertical | "Estar no prumo" = estar em ordem. Mínimo, brasileiro, memorável. |

**Recomendação:** *Kairós* como primeira opção (conceito perfeito para um planner centrado no calendário) e *Órbita* como alternativa mais leve e brasileira. O protótipo v2 veste **Kairós** provisoriamente para o nome ser avaliado em contexto — trocar depois custa nada.

---

## 5. Fora do escopo do v2 (registrado para não perder)

- Notificações reais (push) do check do dia e da revisão semanal — entram na fase 1 do app real (PWA permite).
- Configuração de janelas de trabalho e regras do auto-agendamento — fase 4.
- Página de pessoa (tudo de `@Ana` num lugar) — fase 3; no v2 a menção aparece como chip.
- Importador do Todoist — fase 5; a API do Todoist permite trazer projetos, tarefas, prazos e etiquetas.
