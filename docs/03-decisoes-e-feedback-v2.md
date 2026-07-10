# Decisões e feedback sobre o protótipo v2

**Data:** 09/07/2026 · **Origem:** revisão do protótipo v2 pelo Raul · **Nome aprovado: Kairós** ✓

## Feedback do v2 → o que virou o protótipo v3

| # | Pedido | Solução no v3 |
|---|---|---|
| 1 | Revisão semanal com edição livre (dias sugeridos, não impostos) | O reagendamento de tarefas vencidas mostra os dias como **pílulas pré-selecionadas** (sugestão do app) que o usuário pode trocar antes de confirmar — inclusive "outra data…". Princípio estendido a todo o produto: *o Kairós propõe, o usuário decide*. |
| 2 | Autocompletar `@pessoa` e `#projeto` na captura | Ao digitar `@` ou `#`, a caixa de captura lista sugestões filtradas conforme se digita; clique ou **Tab** completa. |
| 3 | Filtros nas visões de calendário (projeto, área, pessoa) | Barra de filtros acima das visões Dia/Semana/Mês/Ano. O que não corresponde fica esmaecido, mantendo o contexto do dia. |
| 4 | Visão em linha também no mês | A visão Mês ganhou o modo **Linha do tempo**: 31 dias no eixo, densidade de compromissos no alto e barras com a duração de projetos/ações no mês. |
| 5 | Linha do tempo anual: expandir/recolher projetos e controlar meses | Clicar no **nome** do projeto expande/recolhe as ações (subitens); botões de janela: Ano todo · 1º/2º semestre · Trimestre atual. Clicar na **barra** abre o projeto. |
| 6 | Exportação de relatório em PDF por projeto | Botão "Exportar relatório (PDF)" na página do projeto: resumo executivo, objetivos e situação, entregas, pessoas e campo de avaliação de encerramento. Gera versão para impressão/PDF. |
| 7 | Visão por pessoa (discreta) | Clicar em qualquer chip `@pessoa` (tarefas, eventos, notas ou grafo) abre painel lateral com tarefas atribuídas, itens em espera, reuniões da semana e notas que a mencionam. Sem lugar de destaque na navegação — aparece onde a pessoa aparece. |
| 8 | Grafo dinâmico | Clicar num nó abre o painel lateral com o detalhe (projeto com progresso e tarefas; pessoa; nota; recurso) e botão **"Expandir página completa"**. Arrastar segue reorganizando. |
| 9 | Check do dia com destilar/expressar de verdade | Triagem agora em duas etapas: **classificar** (ação / referência / nada disso, com incubar e descartar como atalhos) e depois **destilar** — ação: editar título, escolher projeto/área, quando, quem; referência: destino + essência em uma linha; nada disso: **expressar** criando a nota na hora, com vínculo opcional. |
| 10 | Áreas, Recursos e Arquivo não abriam | Todos clicáveis agora: página de Área (padrão a manter, tarefas, notas, pessoas), página de Recurso (referências destiladas + regra de incubação) e página de Arquivo (projetos concluídos com PDF e "Reativar", itens arquivados, incubados com data de retorno). |
| 11 | **Bug:** painel lateral abria embaçado/ilegível | Corrigido — o véu dos modais (z-index 45, com blur) estava na frente do painel de detalhe (z-index 40). O painel agora fica acima do véu (z-index 48). |

## Registro de decisão

- **Nome:** Kairós (aprovado). "Jarvis" permanece só como nome do repositório.
- O padrão de interação "sugestão pré-selecionada + escolha do usuário" (feedback 1) vira diretriz de design para o auto-agendamento da fase 4.
