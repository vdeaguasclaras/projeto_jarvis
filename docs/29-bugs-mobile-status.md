# Sessão 29 — bugs do teste mobile do Raul (22/07/2026) · v0.12.0

Quatro bugs relatados pelo Raul usando o app no celular, todos na casca
(shell) e na visão Hoje. Só frontend — a versão foi de 0.11.2 para **0.12.0**.

## 1. Título duplicado nos Espaços

Ao abrir Espaços (e qualquer página PARA, Pessoas ou Arquivo), o `Topbar`
continuava renderizando o título da view anterior (ex.: "Tarefas · capturar →
organizar → fazer") em cima do título próprio da página ("Espaços · Tudo o
que você guarda…"). Correção no `AppShell`: o `Topbar` não renderiza quando
`paginaId` está aberto — essas páginas têm cabeçalho e botão "← Espaços"
próprios. Vale para desktop e celular.

## 2. Zoom temporal fora do Hoje (celular)

O seletor Dia/Semana/Mês/Ano só faz sentido na aba Calendário; no Hoje do
celular a navegação é o seletor de 7 dias. O header de calendário agora leva a
classe `topbar-dia` quando a view é o Dia, e o CSS mobile esconde o `.topo-dir`
nesse caso. No desktop nada muda; em Semana/Mês/Ano o zoom continua.

## 3. Lista "Tarefas do dia" expansível (celular)

No celular a lista mostrava tudo e ficava longa. Agora (só ≤900px, via
`matchMedia` — o desktop mantém a rolagem interna do card): recolhida mostra
até **6 itens** (prioridades avulsas ★ e abertas primeiro, concluídas por
último) e um botão "mostrar mais N ▾ / mostrar menos ▴". Se sobrar só 1 item,
não esconde (não vale um clique para um item).

## 4. Menu da conta no celular (avatar redondo)

O trilho (e com ele o avatar/menu da conta) some no celular — não havia como
ver o vínculo, sincronizar o Google nem sair. Novo avatar redondo no canto
superior direito do header (todas as views com Topbar), que abre o menu:

- logado: nome + e-mail, ⟳ Revisão semanal, ⇄ Google Agenda (sync), ◐ Tema,
  🔔 lembrete do check, ← Sair e a versão;
- deslogado: "G Entrar com Google" (o vínculo com a agenda vem junto do login).

Componente `MenuConta` dentro do `Topbar.tsx`, reusando o CSS do `.rail-menu`
(reposicionado com `.mob-menu`). No desktop o avatar não aparece (`display:
none` fora do media query) — lá o menu continua no trilho.

## Notas para a próxima sessão

- O menu da conta agora existe em dois lugares (Rail e Topbar). Se crescer,
  extrair um componente único.
- A fila do produto segue a do CLAUDE.md: renovação do token Google (Edge
  Function), Web Push com app fechado, gamificação/auto-agendamento.
