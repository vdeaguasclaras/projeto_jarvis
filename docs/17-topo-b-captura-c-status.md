# Topo do Dia: proposta B + captura da C — status (sessão de 15/07/2026, 2ª parte)

**Decisão do Raul:** modelo **B** ("prioridades no comando") com a **captura em destaque da C**.
**Banco:** migração 0010 (`imagem_path` em `kairos_inbox`/`kairos_tarefas` + bucket privado `capturas`).

## O que mudou

1. **Check do dia mora na sidebar** (`.check-vivo`): cartão com **anel de progresso** (placar do dia),
   contagem da Inbox, sequência 🔥 e botão "Fazer o check". Saiu do topo da visão Dia — o topo agora
   é só navegação + prioridades + grade (com a coluna "sem horário").
   No **celular** (sem sidebar) fica uma **faixa compacta** (`.check-mobile`) acima das prioridades.
2. **Captura em destaque** (`CaptureFab`): botão flutuante **+** no canto inferior direito
   (atalho **c**), que abre um compositor com:
   - textarea com a mesma gramática (@ # / datas horas), prévia do parse e autocompletar (Tab);
   - **imagem**: colar (Ctrl+V), arrastar ou escolher arquivo — sobe para o Storage
     (`capturas/<userId>/<uuid>.<ext>`, bucket privado, políticas por pasta do dono);
   - Enter captura · Esc fecha · dá para capturar só a imagem (título "Imagem capturada").
   A captura saiu do Topbar (que ficou só com data/título + visões); no celular o FAB substitui a
   barra fixa de baixo.
3. **Imagem acompanha o fluxo**: aparece na triagem (check do dia) e vai junto quando o item vira
   tarefa (fazer hoje / já fiz / delegar / planejar); o painel da tarefa mostra a imagem (URL
   assinada de 1h — clique abre inteira). Captura classificada (#/data) vira tarefa já com a imagem.

## Como verificar

- `cd web && npm run build` ✓ · Chromium: check-vivo na sidebar, FAB + compositor (c/Esc/parse),
  faixa mobile, 7 visões sem erro de console ✓
- RLS real (rollback): insert de captura com `imagem_path` ✓ · bucket e políticas criados ✓
- Pendente de teste do Raul: upload real de imagem em produção (o proxy daqui bloqueia o Storage).

## Próximos passos

1. Teste do Raul no uso real (upload de imagem, check na sidebar, FAB no celular).
2. Candidatos: renovação do token Google sem relogar (Edge Function), Web Push, apertar `jim_*`.
