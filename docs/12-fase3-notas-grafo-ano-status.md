# Fase 3 (Notas + Grafo) e Ano — status (sessão de 11/07/2026, parte 3)

**Produção:** https://projeto-jarvis-seven.vercel.app · **Banco:** migração 0005 aplicada (`kairos_notas.evento_id`)

Com esta entrega, **todas as fases implementáveis sem o OAuth estão concluídas**.
Ficam pendentes apenas: OAuth Google/Microsoft (credenciais do Raul — instruções em docs/11)
e a Fase 2 (sync de agendas), que depende dessas mesmas credenciais.

## Fase 3 — Notas (Zettelkasten)

`NotesView` espelha o módulo do protótipo v6 sobre `kairos_notas`:

- **Lista** com busca e três modos: Fluxo (recentes primeiro), Por grupo (PARA) e Por tema (#tags).
- **Editor** com Visualizar/Editar: markdown do protótipo (negrito, itálico, títulos, citações,
  listas, `- [ ]` encaminhamentos, `[arquivo](file:…)` linkado sem duplicar, mídia como placeholder).
- **[[links]] com autocompletar**: digitar `[[` sugere notas e grupos existentes; clicar num
  [[link]] abre a nota — e **cria** a nota se ela ainda não existir (é assim que a rede cresce).
- **Backlinks** reais ("notas que apontam para cá") calculados dos [[links]].
- **Agrupamento opcional** (chip "sem grupo ▾"): projeto/área/recurso ou atômica — os links estruturam.
- **⚡ Encaminhamentos viram tarefas**: linhas `- [ ]` criam tarefas com `nota_origem_id` e o grupo da nota.
- **Autosave** (700 ms) de título e texto; #tags e @pessoas viram chips derivados do texto.
- **Nota nasce do evento**: botão "✎ Nota do evento" no modal de evento cria a nota vinculada
  (`evento_id`, migração 0005) e abre o editor. Nada é duplicado — o vínculo é metadado.

Markdown coberto por 17 verificações de unidade (negrito/itálico/h2/wikilink/tarefas/citação/tag/
arquivo/link/mídia/pessoa/extratores/escape de HTML) — todas passando.

## Fase 3 — Grafo

`GraphView` porta a simulação de física do protótipo (canvas, repulsão + molas + arrasto de nós):

- Nós: **notas** (verde), **projetos** (roxo), **áreas** (azul), **recursos** (cinza), **@pessoas** (âmbar).
- Arestas: [[links]] entre notas, [[menções]] a projetos/áreas/recursos, agrupamento da nota e @menções.
- Clique numa nota abre o editor; containers/pessoas ganham página própria nas páginas PARA (futuro).
- `prefers-reduced-motion` respeitado (layout estático pré-calculado, como no protótipo).

## Ano (fecha o Marco 5 por completo)

`YearView` no modo **densidade** do protótipo: cada linha é um mês alinhado por dia da semana
(seg–dom), cor = densidade de compromissos (eventos + tarefas com prazo; d1/d2/d3), hoje com contorno
âmbar, navegação ‹ hoje › entre anos, clique num dia abre a Semana. O modo "linhas do tempo" do
protótipo fica para quando houver páginas de projeto com datas de início/fim.

## Como verificar

- `cd web && npm run build` ✓ · markdown: 17/17 ✓ · Chromium: Notas/Grafo/Ano renderizam sem erros ✓
- CRUD de notas sob RLS real (com `evento_id`): insert/update/select como dono ✓ (transação com rollback)

## Próximos passos

1. **OAuth Google/Microsoft** (única pendência do Raul — docs/11) → botões de login → **Fase 2** (sync agendas).
2. Páginas PARA (projeto/área/recurso com objetivos, tarefas, notas vinculadas) — o protótipo já as define.
3. Refino contínuo conforme o uso real (feedback do Raul).
