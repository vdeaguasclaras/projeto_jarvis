import { supabase } from "./supabase";

/** Camada de dados do Kairós — todas as tabelas kairos_* com RLS por usuário. */

export type Kind = "projeto" | "area" | "recurso";
export type Container = { id: string; kind: Kind; nome: string; emoji: string | null };
export type Pessoa = { id: string; nome: string };
export type InboxItem = { id: string; texto: string };
export type TarefaStatus = "a_fazer" | "em_andamento" | "em_espera" | "concluida" | "algum_dia";
export type Tarefa = {
  id: string;
  titulo: string;
  status: TarefaStatus;
  prazo: string | null;
  container_id: string | null;
  concluida_em: string | null;
  agendada_inicio: string | null;
  agendada_fim: string | null;
  duracao_min: number | null;
};
export type EventoOrigem = "local" | "google" | "outlook";
export type Evento = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  origem: EventoOrigem;
  container_id: string | null;
};
export type Prioridade = { id: string; tarefa_id: string; ordem: number };
export type EscopoPrio = "dia" | "semana";

export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoEmDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "hoje" | "amanhã" | "seg" (próxima segunda) | null → data ISO ou null */
export function resolvePrazo(p: string | null): string | null {
  if (!p) return null;
  if (p === "hoje") return hojeISO();
  if (p === "amanhã") return isoEmDias(1);
  if (p === "seg") {
    const d = new Date();
    const delta = (8 - d.getDay()) % 7 || 7;
    return isoEmDias(delta);
  }
  return null;
}

/** Segunda-feira da semana que contém a data (âncora das prioridades da semana). */
export function segundaDe(dataISO: string): string {
  const [a, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Soma dias a uma data ISO (aceita negativos). */
export function somaDias(dataISO: string, dias: number): string {
  const [a, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(a, m - 1, d + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export async function listContainers(): Promise<Container[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("kairos_containers")
    .select("id, kind, nome, emoji")
    .is("arquivado_em", null)
    .order("criado_em");
  return (data as Container[]) ?? [];
}

export async function createContainer(
  userId: string,
  kind: Kind,
  nome: string,
  emoji?: string | null,
): Promise<Container | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("kairos_containers")
    .insert({ user_id: userId, kind, nome, emoji: emoji ?? null })
    .select("id, kind, nome, emoji")
    .single();
  return error ? null : (data as Container);
}

export async function listPessoas(): Promise<Pessoa[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("kairos_pessoas").select("id, nome").order("nome");
  return (data as Pessoa[]) ?? [];
}

export async function listInbox(): Promise<InboxItem[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("kairos_inbox")
    .select("id, texto")
    .is("triado_em", null)
    .or(`incubada_ate.is.null,incubada_ate.lte.${hojeISO()}`)
    .order("criado_em");
  return (data as InboxItem[]) ?? [];
}

export async function capturar(userId: string, texto: string): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_inbox").insert({ user_id: userId, texto });
  return error ? error.message : null;
}

export async function marcarTriado(inboxId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("kairos_inbox").update({ triado_em: new Date().toISOString() }).eq("id", inboxId);
}

export async function incubarItem(inboxId: string, dias = 90): Promise<string> {
  const volta = isoEmDias(dias);
  if (supabase) await supabase.from("kairos_inbox").update({ incubada_ate: volta }).eq("id", inboxId);
  return volta;
}

export async function listTarefas(): Promise<Tarefa[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("kairos_tarefas")
    .select("id, titulo, status, prazo, container_id, concluida_em, agendada_inicio, agendada_fim, duracao_min")
    .order("criada_em", { ascending: false });
  return (data as Tarefa[]) ?? [];
}

export async function criarTarefa(
  userId: string,
  campos: {
    titulo: string;
    status?: TarefaStatus;
    prazo?: string | null;
    container_id?: string | null;
    responsavel_id?: string | null;
    descricao?: string | null;
    concluida?: boolean;
  },
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_tarefas").insert({
    user_id: userId,
    titulo: campos.titulo,
    status: campos.concluida ? "concluida" : (campos.status ?? "a_fazer"),
    prazo: campos.prazo ?? null,
    container_id: campos.container_id ?? null,
    responsavel_id: campos.responsavel_id ?? null,
    descricao: campos.descricao ?? null,
    concluida_em: campos.concluida ? new Date().toISOString() : null,
  });
  return error ? error.message : null;
}

export async function mudarStatusTarefa(id: string, status: TarefaStatus): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("kairos_tarefas")
    .update({ status, concluida_em: status === "concluida" ? new Date().toISOString() : null })
    .eq("id", id);
}

export async function criarPessoa(userId: string, nome: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("kairos_pessoas")
    .insert({ user_id: userId, nome })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function criarNota(
  userId: string,
  titulo: string,
  md: string,
  containerId?: string | null,
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_notas").insert({
    user_id: userId,
    titulo,
    md,
    container_id: containerId ?? null,
  });
  return error ? error.message : null;
}

/** Registra o ritual do dia (placar da gamificação). */
export async function registrarRitual(
  userId: string,
  tipo: "check_dia" | "revisao_semana",
  placar: Record<string, unknown>,
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("kairos_rituais")
    .upsert({ user_id: userId, tipo, data: hojeISO(), placar }, { onConflict: "user_id,tipo,data" });
}

/** Eventos com início dentro do intervalo [deISO, ateISO) — datas locais. */
export async function listEventos(deISO: string, ateISO: string): Promise<Evento[]> {
  if (!supabase) return [];
  const de = new Date(`${deISO}T00:00`).toISOString();
  const ate = new Date(`${ateISO}T00:00`).toISOString();
  const { data } = await supabase
    .from("kairos_eventos")
    .select("id, titulo, inicio, fim, origem, container_id")
    .gte("inicio", de)
    .lt("inicio", ate)
    .order("inicio");
  return (data as Evento[]) ?? [];
}

export async function criarEvento(
  userId: string,
  campos: { titulo: string; inicio: string; fim: string; container_id?: string | null },
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_eventos").insert({
    user_id: userId,
    titulo: campos.titulo,
    inicio: campos.inicio,
    fim: campos.fim,
    container_id: campos.container_id ?? null,
  });
  return error ? error.message : null;
}

export async function atualizarEvento(
  id: string,
  campos: { titulo?: string; inicio?: string; fim?: string; container_id?: string | null },
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_eventos").update(campos).eq("id", id);
  return error ? error.message : null;
}

export async function excluirEvento(id: string): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_eventos").delete().eq("id", id);
  return error ? error.message : null;
}

/** Coloca a tarefa num horário do dia (drag & drop) — o prazo acompanha o dia. */
export async function agendarTarefa(
  id: string,
  inicio: string,
  fim: string,
  prazoISO: string,
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase
    .from("kairos_tarefas")
    .update({ agendada_inicio: inicio, agendada_fim: fim, prazo: prazoISO })
    .eq("id", id);
  return error ? error.message : null;
}

export async function desagendarTarefa(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("kairos_tarefas").update({ agendada_inicio: null, agendada_fim: null }).eq("id", id);
}

export async function listPrioridades(escopo: EscopoPrio, dataISO: string): Promise<Prioridade[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("kairos_prioridades")
    .select("id, tarefa_id, ordem")
    .eq("escopo", escopo)
    .eq("data", dataISO)
    .order("ordem");
  return (data as Prioridade[]) ?? [];
}

/** Substitui as prioridades do dia/da semana pelas escolhidas (máx. 3, na ordem dada). */
export async function definirPrioridades(
  userId: string,
  escopo: EscopoPrio,
  dataISO: string,
  tarefaIds: string[],
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const del = await supabase
    .from("kairos_prioridades")
    .delete()
    .eq("escopo", escopo)
    .eq("data", dataISO);
  if (del.error) return del.error.message;
  if (!tarefaIds.length) return null;
  const { error } = await supabase.from("kairos_prioridades").insert(
    tarefaIds.slice(0, 3).map((tarefa_id, ordem) => ({ user_id: userId, escopo, data: dataISO, tarefa_id, ordem })),
  );
  return error ? error.message : null;
}

/** Sequência de dias consecutivos (até hoje) com check do dia feito. */
export async function sequenciaCheck(): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase
    .from("kairos_rituais")
    .select("data")
    .eq("tipo", "check_dia")
    .order("data", { ascending: false })
    .limit(60);
  if (!data?.length) return 0;
  const datas = new Set(data.map((r: { data: string }) => r.data));
  let seq = 0;
  for (let i = 0; i < 60; i++) {
    if (datas.has(isoEmDias(-i))) seq++;
    else if (i === 0) continue; // hoje ainda pode não ter check
    else break;
  }
  return seq;
}
