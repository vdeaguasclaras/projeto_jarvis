# Marco 7 (PWA) + Mês + Fase 5 (Todoist) — status (sessão de 11/07/2026, parte 2)

**Produção:** https://projeto-jarvis-seven.vercel.app · **Banco:** migração 0004 aplicada

## Marco 7 — PWA completo

- **Service worker** (`web/public/sw.js`): shell offline — navegação com rede primeiro e cache como
  reserva; estáticos do Next com cache primeiro. Clique na notificação foca/abre o app.
- **Ícones instaláveis**: PNGs 192/512 (normal + maskable) gerados do `icon.svg`; manifest completo.
  No celular, "Adicionar à tela inicial" instala o Kairós como app.
- **Notificação do check do dia**: com permissão concedida (botão "🔔 Ativar lembrete do check" no
  rodapé da sidebar), o app notifica **uma vez por dia** ao abrir com Inbox pendente.
  *Limite conhecido:* notificação com o app fechado exige Web Push com servidor — fica para quando
  houver backend (hoje o app é 100% estático + Supabase).
- **Arrastar por toque** (`arrasteToque` em TimeGrid): segurar e arrastar um bloco da grade ou um chip
  da bandeja "Sem horário" mostra um fantasma que segue o dedo; soltar numa coluna calcula dia + hora
  (meias horas), igual ao mouse. Funciona no Dia e na Semana.

## Restante do Marco 5 — visão Mês

- Grade mensal real (`MonthView`): eventos + tarefas com prazo no dia, navegação ‹ hoje ›,
  dias de outros meses esmaecidos, hoje em destaque. No celular, pílulas viram pontinhos.
- Clique num dia abre a **Semana** correspondente.
- **Ano** continua "em construção" (baixa prioridade — só se o Raul sentir falta).

## Fase 5 — importador do Todoist (executado)

Importação feita via conector MCP nesta sessão, com **idempotência** pela coluna `todoist_id`
(migração 0004: coluna + índice único parcial em containers, tarefas e inbox — reexecutar não duplica).

Mapeamento aplicado (regras do produto):

- Projetos do Todoist → **áreas** PARA (são listas contínuas, sem fim definido):
  Pessoal, Lembretes, Inclusão, 🏃 Treino Funcional em Casa (emoji separado na coluna própria). **4 áreas.**
- Tarefas classificadas (de projeto nomeado) ou com prazo → **`kairos_tarefas` direto** (19 tarefas;
  prioridade p1–p3 do Todoist mapeada; recorrência não existe no Kairós ainda → anotada na descrição).
- Itens do Inbox do Todoist **sem prazo** → **`kairos_inbox`** para triagem no check do dia (7 itens).
- Tarefas concluídas do Todoist não foram importadas (sem valor para o placar retroativo).

Para reimportar no futuro (novas tarefas do Todoist): repetir os mesmos INSERTs via MCP — o
`on conflict ... do nothing` ignora o que já veio. O Todoist continua intocado (nada foi apagado lá).

## OAuth Google/Microsoft (Marco 2 restante) — o que só o Raul pode fazer

O código de login social é trivial (`signInWithOAuth`), mas **exige credenciais**:

1. **Google**: [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services →
   Credentials → Create OAuth client ID (Web). Redirect URI:
   `https://budjzwlccrnxdnkaqtko.supabase.co/auth/v1/callback`.
2. **Microsoft**: [portal.azure.com](https://portal.azure.com) → Microsoft Entra ID → App registrations →
   New registration. Mesma redirect URI acima.
3. Colar Client ID + Secret no painel do Supabase (Authentication → Providers → Google/Azure).
4. Me avisar — adiciono os botões de login e, na sequência, a **Fase 2** (sync Google Calendar/Outlook,
   que reaproveita essas mesmas credenciais com os escopos de calendário).

## Como verificar

- `cd web && npm run build` ✓ · smoke test local: `/`, `/sw.js`, `/manifest.json`, ícones 200 ✓
- Chromium: service worker registrado, visão Mês renderiza, zero erros de console ✓
- Import sob RLS real (como o dono): 4 áreas / 19 tarefas / 7 inbox visíveis; duplicata ignorada ✓

## Próximos passos

1. **OAuth** (aguarda credenciais do Raul — instruções acima) → botões de login → **Fase 2** (sync agendas).
2. **Fase 3** — Notas (Zettelkasten) e Grafo.
3. Ano do calendário, se fizer falta.
