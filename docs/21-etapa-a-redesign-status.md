# Etapa A do redesign — tokens, tema e shell novo (21/07/2026)

Primeira etapa do plano `docs/20-plano-redesign.md` (handoff em `prototipos/redesign-2026-07/`).
**Banco:** nenhuma migração (a `cor` dos containers, 0012, fica para a Etapa B que a usa).

## O que mudou

1. **Design tokens novos** em `globals.css`, direto de TOKENS.md: base creme (#f7f3ec),
   verde #1c6b57, terracota, lilás, estados, sombras e overlay de ritual. Os nomes antigos
   (`--accent`, `--today`, `--task`, `--line`…) viraram **apelidos** dos tokens novos — por
   isso o app inteiro (grade, tarefas, notas, modais) ganhou a paleta sem mudar componente.
2. **Modo escuro completo** (DARK-MODE.md): tokens-base trocam sob `prefers-color-scheme`
   e `[data-theme]`; os apelidos seguem via `var()`. Regra "texto sobre acento inverte"
   implementada com `--on-accent` (#fffdf8 ↔ #171a17). Preferência em
   `localStorage("kairos.tema")`, reaplicada por script inline no layout (sem flash);
   ciclo sistema → escuro → claro no ◐.
3. **Shell novo**: sidebar de 248px saiu; entrou o **trilho de 76px** (`Rail.tsx`) — K,
   Hoje, Agenda, **+ central** (gradiente), Tarefas, Espaços, ◐ e avatar com menu da conta
   (revisão semanal, sync Google, tema, notificação, sair). No celular, a bottomnav virou a
   **tab bar flutuante** (`TabBar.tsx`): Hoje · Calendário · + · Tarefas · Espaços.
4. **Espaços (hub provisório)** (`EspacosHub.tsx`): reúne PARA + Notas + Grafo + Arquivo +
   criação num lugar só — o grid 11c de verdade chega na Etapa F.
5. **Ícones do handoff** (`Icones.tsx`): SVGs do canvas recriados com `currentColor`
   (traço 1.7–1.8). **Lora** via `next/font` (`--font-lora`, hoje no `--serif`).
6. **Captura**: o + do trilho/tab bar abre o compositor (`abrirSinal`); o FAB do canto saiu
   (`semBotao`) — atalho `c` continua. A faixa do check aparece também no desktop
   (entrada do Despacho até o card quente da Etapa B).
7. Ícone do app e `manifest.json` no verde novo (#1c6b57 / fundo #f7f3ec).

## Decisões de implementação

- Apelidos de token são ponte, não destino: código novo usa os nomes do handoff
  (`--green`, `--terracotta-bg`…); os antigos morrem quando cada tela for revestida.
- `Sidebar.tsx` e `Topbar` com ☰ foram removidos; o Topbar (título + segmented de visões)
  fica até a Etapa B trazer o header da Hoje (saudação Lora, ‹ hoje ›, zoom temporal).
- Overlay de rituais agora é token (`--overlay-ritual`) usado pelo `.scrim`.

## Como foi verificado

- `npm run build` ✓ (Lora baixa no build, nada externo em runtime).
- Chromium + Playwright em modo demonstração: desktop e mobile (402×874), claro e escuro,
  **zero erros de console**; + do trilho e da tab bar abrem o compositor; ◐ aplica
  `data-theme`; menu do avatar abre/fecha. Capturas na sessão (scratchpad).

## Próximo passo

**Etapa B — Hoje** (10a/2a): header novo (saudação Lora, progresso, ‹ hoje ›, segmented),
hero "Agora", timeline com cores por container (migração 0012 `cor`), coluna direita
(card do Despacho, Tarefas do dia ★ = prioridades, Em espera/Amanhã).
