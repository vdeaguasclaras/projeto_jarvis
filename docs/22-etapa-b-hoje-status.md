# Etapa B do redesign — Hoje (10a/2a) + versionamento (21/07/2026)

Segunda etapa de `docs/20-plano-redesign.md`. **Versão: v0.3.0** (só frontend — ver nota do banco).

## Versionamento (nova regra do Raul, registrada no CLAUDE.md)

- Formato **0.X.Y**: frontend soma no X, backend soma no Y. 0.2.0 = tudo até a Etapa A.
- Fonte única `web/src/lib/versao.ts` (espelhada no `package.json`); visível no menu do
  avatar e no rodapé dos Espaços ("Kairós v0.3.0 · em teste").

## O que mudou

1. **Header novo** (`Topbar.tsx`): saudação por hora do dia ("Bom dia, Raul" — nome do login
   Google; Lora no celular) + data + 🔥 sequência; barra de progresso "N de M" (tarefas do
   dia); navegação ‹ hoje ›; segmented pill só com o zoom temporal **Dia/Semana/Mês/Ano**.
   Tarefas/Notas/Grafo saíram do segmented (vivem no trilho/Espaços); os atalhos 1–7 continuam.
2. **Hoje 10a** (`DayView.tsx` reescrito): grid `1fr + 340px`.
   - **Hero "Agora"** time-aware: compromisso corrente com barra de progresso e "termina em
     N min"; sem corrente, o próximo de hoje ("A seguir · em 1h29"); botão "Nota do evento ✎".
   - **Timeline em card** com rolagem interna (a página não estica); eventos com **cor por
     container**.
   - Coluna direita: **card quente do Despacho** (terracota, contador da Inbox, "Fazer
     agora", sequência, atalho `D` — novo atalho global), **Tarefas do dia** (★ = prioridades
     persistentes + avulsas, checkbox conclui, arrastar dá hora, "venceu dd/mm", contador
     "N de M", input "+ tarefa", "Ajustar ★"), **Em espera/Amanhã** (@pessoa + "cobrar dd/mm").
   - A faixa antiga do check, a linha de prioridades e a coluna "sem horário" foram absorvidas
     por esses cards.
3. **Mobile 2a**: seletor de 7 dias (dom–sáb, hoje em terracota) + blocos empilhados.
4. **Cores por container** (`lib/cores.ts`): paleta de tokens (verde/terracota/lilás/marrom)
   escolhida de forma estável pelo id — funciona nos dois temas.

## ⚠️ Banco — migração 0012 NÃO aplicada

A coluna `kairos_containers.cor` (escolha manual de cor) foi **recusada nesta sessão** —
a timeline usa a paleta determinística por id, sem depender do banco. Quando o Raul quiser
escolher cores por projeto: criar/aplicar a migração 0012, expor `cor` em `db.ts` e trocar
`corDoContainer` para preferir a cor salva. Aí a versão soma no Y.

## Como foi verificado

- `npm run build` ✓ · Playwright/Chromium nos 4 modos (desktop/mobile × claro/escuro) sem
  erros de console. Corrigida no caminho uma **hidratação** (#418): saudação e hero dependem
  do relógio — saudação com `suppressHydrationWarning`, hero só monta no cliente.

## Próximo passo

**Etapa C — Captura ⌘K** (10b): a lógica do `CaptureFab` vira paleta de comando
(⌘K ou +), tabs Tarefa/Nota/Evento, chips de parsing em tempo real.
