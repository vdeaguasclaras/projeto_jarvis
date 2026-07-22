# Etapa F do redesign — Espaços: hub + Pessoas (11c/15a–d/7a) · v0.7.0 (22/07/2026)

Sexta etapa de `docs/20-plano-redesign.md`. Sem migração — saúde, cobrança e
confiabilidade são **derivadas** de `kairos_tarefas`/`kairos_notas`, nunca colunas.

## O que mudou

1. **Hub Espaços (11c)** — o provisório da Etapa A virou o grid de 3 colunas:
   - **Projetos**: cor (paleta determinística), N abertas, barra de progresso e
     "próxima: {ação mais urgente} · prazo"; card abre a página do projeto.
   - **Áreas**: mini-cards com **saúde 15b** (● verde em dia · terracota pede
     atenção · âmbar quieta demais — `lib/saude.ts`, tarefas vencidas / 3 semanas
     sem movimento); recursos listados no rodapé do card ("recursos moram nas áreas").
   - **Pessoas**: até 5, com chip de cobrança ("cobrar amanhã") ou "em dia".
   - **Grafo**: miniatura SVG (centro = projeto com mais abertas, na cor dele) +
     contagem real de conexões ([[links]] + notas agrupadas + projeto↔área).
   - **Notas recentes**: borda lilás, "ontem · [[grupo]]"; **Arquivo** como faixa.
   - **Busca "em tudo"** no topo filtra projetos/áreas/pessoas/notas ao digitar.
2. **Pessoas (15c — página nova)**, `PessoasPage.tsx`: lista à esquerda com badge
   de pendências e a cobrança mais próxima (card com borda terracota quando é para
   já/hoje/amanhã); detalhe com **"Está com ela"** (⏳ + "delegada dd/mm · ▶ projeto ·
   cobrar agora →" — clique abre o painel da tarefa), **histórico** de entregas
   ("no prazo" / "prazo era dd/mm") e **confiabilidade**: "entregou N de M no prazo
   nos últimos 2 meses" (verde ≥ 70%, senão terracota com conselho). "+ Pessoa" cria
   na hora; em espera = delegada, prazo = data de cobrança.
3. **Arquivo (15d)**, `ArquivoPage.tsx`: busca com **highlight `<mark>`**, chips
   Tudo/Projetos/Áreas/Recursos/**Incubados** com contagem, "↩ Restaurar" na linha
   (desarquiva) e "abrir". Incubados (novo `listIncubados`) mostram "volta ao
   Despacho em dd/mm" com "↩ Acordar agora" (desincuba) e a faixa "voltam sozinhos".
4. **Toques 15a/15b nas páginas PARA**: chip de **saúde** no cabeçalho da área;
   no projeto, seção **Pessoas** (pendências por responsável) e a **projeção de
   término** pelo ritmo de 14 dias ("no ritmo atual, você termina 2 semanas antes
   da meta 🎯" / terracota quando passa).
5. **Celular (7a)**: hub em 6 cards (Projetos/Áreas/Pessoas/Notas/Grafo/Arquivo)
   com contadores reais; Projetos/Áreas abrem a lista (ParaLista ganhou `kinds`);
   Pessoas empilha lista → detalhe.
6. Versão **v0.7.0** (só frontend).

## Como foi verificado

- `npm run build` ✓ · Playwright/Chromium com página demo temporária (removida):
  hub claro/escuro, busca filtrando, Pessoas (troca de pessoa na fila, urgência,
  confiabilidade nos dois tons), Arquivo com filtros e highlight, hub mobile 7a e
  Pessoas mobile escuro — zero erros de console.

## Próximo passo

**Etapa G — Notas: editor com markdown vivo** (12a/12b/13a · 8a): highlight em tempo
real ([[conexões]] lilás, @pessoas terracota, #projetos verde) sobre a edição, layout
lista 300px + editor, guia de marcações (?), expandir (E). Maior risco técnico do
plano — prototipar o overlay cedo dentro da etapa.
