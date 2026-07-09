# Decisões e feedback sobre o protótipo v5 — fechamento do design

**Data:** 09/07/2026 · **Origem:** revisão do protótipo v5 pelo Raul · **Status: última rodada de design antes da Fase 1**

## Feedback do v5 → o que virou o protótipo v6

| # | Pedido | Solução no v6 |
|---|---|---|
| 1 | Não dava para alterar o título "Nova nota" | Título da nota é editável (clique nele); ao criar nota nova, o título já vem selecionado para sobrescrever. Enter confirma. |
| 2 | `[` deveria virar `[[ ]]` com autocompletar; ligar notas a projetos, áreas e pessoas | No editor, digitar `[` insere o par e `[[` abre autocompletar com **notas, projetos, áreas e @pessoas** (estilo Obsidian). Além dos links no texto, a nota ganhou **metadados**: grupo e pessoas vinculadas (chips no cabeçalho). |
| 3 | Como alterar o "sem grupo"? | O chip de grupo virou botão (`sem grupo ▾` / `Equipe ▾`): abre o painel de metadados com todas as opções (Nenhum · projetos · áreas · recursos) e as pessoas. Reagrupar não quebra nenhum link. |
| 4 | Nota virar ação (encaminhamentos de reunião/atendimento) | Linhas `- [ ]` no markdown são reconhecidas como encaminhamentos; a nota exibe o botão **"⚡ Criar N tarefas dos encaminhamentos"** — cria as tarefas já vinculadas à nota de origem. |
| 5 | Acompanhamento gameficado | **Placar do dia** no check (barra de progresso + "2 de 6" + sequência 🔥 de dias com check) e **placar da semana** na revisão (% concluído, sequência de revisões, melhor dia). "Fazer agora" soma no placar; Inbox zero dá +10 pontos e mostra a sequência. |
| 6 | "Hoje" na barra lateral não fazia nada | Corrigido — volta à visão do Dia. |
| 7 | Menu lateral colapsável (sanduíche) | Botão ☰ no topo recolhe/expande a barra lateral com animação — mais espaço em telas menores de desktop. |
| 8 | Fluxo decisório GTD no check do dia | A triagem agora segue a árvore do David Allen, uma pergunta por vez: **"É acionável?"** → não: referência / nota / incubar / descartar; sim: **"Leva menos de 2 minutos?"** → *fazer agora* (regra dos 2 minutos, soma no placar) · *delegar* (para quem + quando cobrar → "Em espera") · *adiar e planejar* (destilar: projeto, quando, quem). O CODE continua como régua no topo — o GTD detalha o "Organizar" sem concorrer com ele. |

## Decisão de método (item 8)

CODE (Forte) e GTD (Allen) não competem: o CODE organiza o **conhecimento** (capturar → organizar → destilar → expressar) e o fluxo GTD decide o **destino da ação** dentro do "Organizar". Como as perguntas aparecem uma de cada vez, o usuário nunca vê a árvore inteira — só a próxima decisão. Fica registrado como padrão do produto.
