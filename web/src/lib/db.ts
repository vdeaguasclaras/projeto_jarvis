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
};

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
    .select("id, titulo, status, prazo, container_id, concluida_em")
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
