# Páginas PARA + dia inteiro + check redesenhado — status (sessão de 14/07/2026)

**Produção:** https://projeto-jarvis-seven.vercel.app · **Banco:** migração 0008 (`kairos_eventos.dia_inteiro`)

Decisão do Raul: **OAuth Microsoft/Outlook fora do momento** (não implementar por ora).

## 1 · Check do dia — etapa de horários redesenhada (bug)

A tela anterior dependia de vagas livres no restante do dia; à noite não havia nenhuma e sobrava só
"sem horário" ("reservar" não fazia nada). Agora: **lista simples de tarefas — toque numa e atribua
dia, hora e (opcional) projeto/área**; "Reservar horário ✓" aplica na hora (prazo acompanha o dia);
"Concluir" fecha deixando o resto como está. Funciona em qualquer horário do dia.

## 2 · Eventos de dia inteiro

- Migração 0008: coluna `dia_inteiro` em `kairos_eventos`.
- O sync importa eventos do Google com `start.date` (feriados, aniversários, viagens) — fim exclusivo,
  meia-noite local; multi-dia coberto.
- **Faixa "O dia todo"** acima da grade no Dia e na Semana (chips clicáveis → painel); Mês e Ano contam
  cada dia coberto; o painel mostra "o dia todo" (com intervalo se for multi-dia).
- Revisão semanal ignora dia inteiro nas horas ocupadas e nas vagas de foco (senão o feriado viraria "⚠ 24h").
- A janela de busca do Dia/Semana recuou 14 dias para pegar eventos longos que começaram antes.

## 3 · Páginas PARA (`ParaPage`)

- Clique num projeto/área/recurso da sidebar abre a **página** dele: emoji + nome, tipo, prazo
  (projetos), contadores, **descrição** e **objetivo 🎯** (editáveis pelo "✎ editar", junto com emoji
  e prazo), **barra de progresso** (concluídas ÷ total do grupo).
- **Tarefas do grupo**: nova tarefa rápida (input + Enter), concluir em 1 clique (recorrência
  respeitada), clique abre a edição completa.
- **Notas vinculadas** ao grupo (clique abre no editor).
- **▤ Arquivar** (com confirmação): some da sidebar, nada é apagado — o A do PARA. `arquivado_em`.
- **Celular**: item "Projetos" do menu inferior abre a **lista PARA** (projetos/áreas/recursos com
  contadores) → página. Trocar de visão fecha a página.

## Como verificar

- `cd web && npm run build` ✓ · Chromium: 7 visões sem erros de console ✓
- RLS real: evento dia inteiro (google_id composto), descrição/objetivo e arquivamento de container ✓ (rollback)
- Pendente de teste do Raul: sync trazendo os dia-inteiro reais; páginas PARA no uso.

## Próximos passos

1. Feedback do Raul (check redesenhado, dia inteiro, páginas PARA).
2. Candidatos seguintes: renovação do token Google sem relogar (Edge Function), Web Push com app
   fechado, apertar políticas das tabelas `jim_*` antes de compartilhar o app, gamificação plena /
   auto-agendamento sugerido.
3. (Adiado por decisão: OAuth Microsoft + Outlook.)
