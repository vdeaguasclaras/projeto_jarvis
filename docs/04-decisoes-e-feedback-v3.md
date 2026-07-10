# Decisões e feedback sobre o protótipo v3

**Data:** 09/07/2026 · **Origem:** revisão do protótipo v3 pelo Raul

## Feedback do v3 → o que virou o protótipo v4

| # | Pedido | Solução no v4 |
|---|---|---|
| 1 | Prioridades do dia e da semana; revisão semanal com retrospectiva, vislumbre e decisões detalhadas | Faixa "★ Prioridades de hoje" no topo do Dia e "★ Prioridades da semana" no topo da Semana. A revisão semanal foi reestruturada em 7 passos: (1) retrospectiva da semana que fechou (concluídas, foco, capturas, vencidas, prioridades cumpridas), (2) vislumbre da semana que entra (carga por dia, alerta de dia tomado), (3) decisão de prioridades da semana (até 3, multi-seleção), (4) vencidas com dias sugeridos editáveis, (5) **bloco de foco detalhado** — mostra os horários realmente livres, já descontados os compromissos, (6) **projeto parado** — pede a tarefa concreta (editável) e o dia, (7) estado da Inbox. |
| 2 | Mobile: captura embaixo; PARA no menu inferior; botão voltar do Android | Captura fixa na parte de baixo, acima do menu (sugestões abrem para cima). Menu inferior virou o PARA: Hoje · Projetos · Áreas · Recursos · Arquivo — as visões (Dia/Semana/Mês/Ano/Tarefas/Grafo) ficam em cima. Botão voltar integrado ao histórico do navegador: fecha painéis/modais e volta à tela principal em vez de sair do app. |
| 3 | Check do dia: criar projetos/áreas novos, outras datas e responsáveis | Cada grupo da triagem ganhou a opção livre: "+ novo projeto/área…", "outra data…", "outra pessoa…", "+ novo recurso…" — abre um campo de texto na hora, sem sair do fluxo. |
| 4 | Áreas devem mostrar seus projetos | Página de Área abre com a seção "Projetos da área" (com progresso, clicável); área sem projeto mostra o estado vazio explicando que uma área abriga vários projetos. |
| 5 | Marcação para área na captura (`/`) | `@pessoa` · `#projeto` · `/área`, todos com autocompletar. |
| 6 | Filtros com múltipla seleção | Os filtros agora combinam (OR): dá para ver, por exemplo, "Mudança de sede" + "Equipe" + "@Ana" ao mesmo tempo. "Todos" limpa. |
| 7 | Expandir/recolher também no mês | A linha do tempo do Mês tem os mesmos grupos expansíveis da anual (clique no nome do projeto). |
| 8 | Mudar o dia na visão de tarefas | Seletor de dia (qua 8 · qui 9 · sex 10 · seg 13) na visão Tarefas. |
| 9 | Captura não reconhecia datas numéricas | Agora reconhece `24/07`, `24/07/2026` e `dia 24`, além dos dias da semana. |
| 10 | Filtros e kanban nas tarefas | A barra de filtros vale também para Tarefas (lista e kanban), e há o modo **Kanban**: A fazer · Em andamento · Em espera · Concluída. |

## Notas para o produto real

- O detalhamento do bloco de foco (passo 5 da revisão) é a semente do motor de auto-agendamento da fase 4: encontrar espaço livre real é a mesma consulta.
- O padrão "pílulas sugeridas + campo livre" (triagem e revisão) vira o componente base de formulários rápidos.
- No mobile, o histórico de navegação (voltar fecha camadas) deve ser implementado com rotas de verdade (Next.js) — no protótipo é `history.pushState`.
