# Etapa C do redesign — Captura ⌘K (10b) · v0.4.0 (21/07/2026)

Terceira etapa de `docs/20-plano-redesign.md`. Sem migração (o `dia_inteiro` já existia da 0008).

## O que mudou

1. **A captura virou paleta de comando** (`Captura.tsx`, substitui o `CaptureFab`):
   central, 640px, fundo desfocado (overlay mais leve que o de rituais, como no canvas).
   Abre com **⌘K/Ctrl+K de qualquer tela**, com o atalho antigo `c` e com o **+** do
   trilho/tab bar. ⏎ cria · Esc fecha.
2. **Tabs Tarefa / Nota / Evento** — `Tab` alterna o tipo (com autocomplete aberto, o Tab
   completa a sugestão, como antes; Shift+Tab volta).
   - **Tarefa**: a lógica de sempre (parser, imagem por colar/arrastar, @pessoa→responsável,
     `#`//` reconhecidos → direto, sem Inbox).
   - **Nota**: a primeira linha vira o título; `#projeto`//`área` agrupa; cria e **abre no
     editor** para escrever o corpo.
   - **Evento**: data/hora do parser (1h de duração padrão); **sem hora vira evento de dia
     inteiro**; sem data, cai no dia sendo visto; `#projeto` vincula.
3. **Chips de parsing em tempo real** e **rodapé dinâmico** que diz o que o ⏎ vai fazer
   ("criar em Sede nova" / "criar p/ 24/07" / "→ Inbox" / "criar às 14:00" / "criar (dia
   inteiro)" / "criar e abrir a nota").
4. **Celular**: o + central abre um **leque** (☑ Tarefa · ✎ Nota · 🗓 Evento) — o + gira
   para ×; escolher abre a paleta já na tab certa.
5. `criarEvento` ganhou `dia_inteiro` (código; coluna já existia).

## Como foi verificado

- `npm run build` ✓ · Playwright/Chromium: ⌘K abre, 5 chips no exemplo do canvas, Tab
  alterna Tarefa→Nota→Evento, rodapé muda ("⏎ criar às 14:00"), Esc fecha, leque mobile
  abre e escolhe a tab — sem erros de console.

## Próximo passo

**Etapa D — Despacho** (11a/2b/3a): renomear o check do dia, fila à esquerda, 6 destinos
com atalhos 1–6, bottom sheet no celular com swipe.
