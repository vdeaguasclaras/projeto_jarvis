# Decisões e feedback sobre o protótipo v4

**Data:** 09/07/2026 · **Origem:** revisão do protótipo v4 pelo Raul

## Feedback do v4 → o que virou o protótipo v5

| # | Pedido | Solução no v5 |
|---|---|---|
| 1 | **Bug:** "outra data…" / "outra pessoa…" na triagem não abriam campo de escolha | Corrigido. Causa: o campo livre é escondido por uma classe CSS (`display:none`) e, ao exibir, o código limpava o estilo inline em vez de sobrescrevê-lo — o CSS voltava a esconder. Agora força `display:block`. |
| 2 | **Bug:** mesmo problema no reagendamento da revisão semanal | Além do bug acima, faltavam os campos livres na revisão. Adicionados em "outra data…" (nas duas tarefas vencidas) e "outro horário…" (bloco de foco); a confirmação usa o valor digitado. |
| 3 | Projetos devem mostrar as áreas a que pertencem (backlink entre as partes) | Página de projeto exibe o chip "▣ Área · Financeiro" (clicável — abre a área). Com o v4 já mostrando os projetos dentro das áreas, o vínculo agora é bidirecional. |
| 4 | Módulo de notas: markdown estilo Obsidian, com agrupamento **opcional** (essência do Zettelkasten) | Nova visão **Notas** (tecla 7, aba própria e item da barra lateral): painel de lista + editor. Markdown com títulos, listas, negrito/itálico, citações, `[[wikilinks]]` clicáveis (abrem a nota ou o projeto), `#temas` e `@pessoas`. Modos **Visualizar/Editar** (o editor é texto puro monoespaçado, como no Obsidian). Backlinks calculados automaticamente ao pé da nota. **Agrupamento opcional em três modos:** *Fluxo* (lista corrida, sem hierarquia), *Por grupo* (projeto/área/recurso — notas sem grupo aparecem como "atômicas") e *Por tema* (#tags). Busca e "+ Nova" (nasce sem grupo, em modo de edição). |

## Nota conceitual (item 4)

O modelo segue Luhmann: a nota é atômica e **não precisa** de lugar — os `[[links]]` e os backlinks fazem a estrutura emergir. O grupo (projeto/área/recurso do PARA) é um *empréstimo* opcional de contexto, não uma pasta obrigatória: a mesma nota pode ser vista no fluxo, no grupo ou pelo tema, e mover/desagrupar não quebra nenhum link.
