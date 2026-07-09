/** Dados de demonstração da Fase 1 — substituídos pelo Supabase no marco 3. */

export type CalSource = "g" | "o" | "task";

export type DayEvent = {
  id: string;
  start: number; // hora decimal (10.5 = 10h30)
  end: number;
  title: string;
  source: CalSource;
  container: string;
};

export const DAY_EVENTS: DayEvent[] = [
  { id: "e1", start: 8.5, end: 9.25, title: "Check do dia + prioridades", source: "task", container: "Rotina" },
  { id: "e2", start: 10, end: 11, title: "Reunião de equipe", source: "g", container: "Equipe" },
  { id: "e3", start: 11.5, end: 12.5, title: "Parecer do contrato 114", source: "task", container: "Financeiro" },
  { id: "e4", start: 14, end: 15, title: "Atendimento — Dna. Célia", source: "o", container: "Atendimentos" },
  { id: "e5", start: 16.5, end: 18, title: "Rascunho do relatório anual", source: "task", container: "Relatório anual 2026" },
];

export const PROJECTS = [
  { id: "sede", name: "Mudança de sede", color: "var(--today)", count: 5 },
  { id: "rel", name: "Relatório anual 2026", color: "var(--accent)", count: 8 },
  { id: "sist", name: "Sistema de atendimento", color: "var(--task)", count: 12 },
];

export const AREAS = ["Equipe", "Atendimentos", "Financeiro"];
export const RESOURCES = ["Gestão de projetos", "Leituras"];

export const DAY_PRIORITIES = [
  { label: "Check do dia", done: true },
  { label: "Parecer do contrato 114", done: false },
  { label: "Rascunho do relatório anual", done: false },
];

export const VIEWS = [
  { id: "dia", label: "Dia", key: "1" },
  { id: "semana", label: "Semana", key: "2" },
  { id: "mes", label: "Mês", key: "3" },
  { id: "ano", label: "Ano", key: "4" },
  { id: "tarefas", label: "Tarefas", key: "5" },
  { id: "grafo", label: "Grafo", key: "6" },
  { id: "notas", label: "Notas", key: "7" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

/** O que cada visão pendente entrega, por marco da Fase 1 (doc 07). */
export const ROADMAP: Record<string, { marco: string; entrega: string }> = {
  semana: { marco: "Marco 5 — Calendário local", entrega: "Grade semanal com eventos e blocos de tarefa arrastáveis." },
  mes: { marco: "Marco 5 — Calendário local", entrega: "Grade mensal + linha do tempo com projetos expansíveis." },
  ano: { marco: "Marco 5 — Calendário local", entrega: "Ano linear (densidade) e linhas do tempo com janela de meses." },
  tarefas: { marco: "Marco 4 — Tarefas + PARA", entrega: "Lista GTD por dia, filtros combinados e kanban." },
  grafo: { marco: "Fase 3 — Notas conectadas", entrega: "Grafo interativo de notas, projetos e pessoas." },
  notas: { marco: "Fase 3 — Notas conectadas", entrega: "Markdown, [[links]] com autocompletar, backlinks e agrupamento opcional." },
};
