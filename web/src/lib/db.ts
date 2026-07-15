import { supabase } from "./supabase";

/** Camada de dados do Kairós — todas as tabelas kairos_* com RLS por usuário. */

export type Kind = "projeto" | "area" | "recurso";
export type Container = {
  id: string;
  kind: Kind;
  nome: string;
  emoji: string | null;
  descricao: string | null;
  objetivo: string | null;
  prazo: string | null;
  /** projeto pode pertencer a uma área (PARA) */
  area_id: string | null;
};
export type Pessoa = { id: string; nome: string };
export type InboxItem = { id: string; texto: string; imagem_path: string | null };
export type TarefaStatus = "a_fazer" | "em_andamento" | "em_espera" | "concluida" | "algum_dia";
export type Recorrencia = "diaria" | "semanal" | "quinzenal" | "mensal";
export type Tarefa = {
  id: string;
  titulo: string;
  status: TarefaStatus;
  prazo: string | null;
  container_id: string | null;
  responsavel_id: string | null;
  descricao: string | null;
  criada_em: string;
  concluida_em: string | null;
  agendada_inicio: string | null;
  agendada_fim: string | null;
  duracao_min: number | null;
  recorrencia: Recorrencia | null;
  recorre_ate: string | null;
  imagem_path: string | null;
};
export type EventoOrigem = "local" | "google" | "outlook";
export type Evento = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  origem: EventoOrigem;
  container_id: string | null;
  dia_inteiro: boolean;
};
/** Prioridade do dia/da semana: aponta para uma tarefa OU é avulsa (só título). */
export type Prioridade = {
  id: string;
  tarefa_id: string | null;
  titulo: string | null;
  feita: boolean; // só para as avulsas; das tarefas deriva do status
  ordem: number;
};
export type EscopoPrio = "dia" | "semana";
export type Nota = {
  id: string;
  titulo: string;
  md: string;
  container_id: string | null;
  evento_id: string | null;
  criada_em: string;
  atualizada_em: string;
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

/** Segunda-feira da semana que contém a data (âncora das prioridades da semana). */
export function segundaDe(dataISO: string): string {
  const [a, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Data local (YYYY-MM-DD) de um timestamp. */
export function dataLocalDe(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** O evento de dia inteiro cobre esta data? (fim é exclusivo, padrão do Google) */
export function cobreDia(e: Evento, dataISO: string): boolean {
  return e.dia_inteiro && dataISO >= dataLocalDe(e.inicio) && dataISO < dataLocalDe(e.fim);
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
    .select("id, kind, nome, emoji, descricao, objetivo, prazo, area_id")
    .is("arquivado_em", null)
    .order("criado_em");
  return (data as Container[]) ?? [];
}

export async function createContainer(
  userId: string,
  kind: Kind,
  nome: string,
  emoji?: string | null,
  areaId?: string | null,
): Promise<Container | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("kairos_containers")
    .insert({ user_id: userId, kind, nome, emoji: emoji ?? null, area_id: kind === "projeto" ? (areaId ?? null) : null })
    .select("id, kind, nome, emoji, descricao, objetivo, prazo, area_id")
    .single();
  return error ? null : (data as Container);
}

/** Edição da página PARA (nome, ícone, descrição, objetivo, prazo, área do projeto). */
export async function atualizarContainer(
  id: string,
  campos: { nome?: string; emoji?: string | null; descricao?: string | null; objetivo?: string | null; prazo?: string | null; area_id?: string | null },
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_containers").update(campos).eq("id", id);
  return error ? error.message : null;
}

/** Arquivar tira da sidebar e das listas; nada é apagado (PARA: Archives). */
export async function arquivarContainer(id: string): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase
    .from("kairos_containers")
    .update({ arquivado_em: new Date().toISOString() })
    .eq("id", id);
  return error ? error.message : null;
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
    .select("id, texto, imagem_path")
    .is("triado_em", null)
    .or(`incubada_ate.is.null,incubada_ate.lte.${hojeISO()}`)
    .order("criado_em");
  return (data as InboxItem[]) ?? [];
}

export async function capturar(userId: string, texto: string, imagemPath?: string | null): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase
    .from("kairos_inbox")
    .insert({ user_id: userId, texto, imagem_path: imagemPath ?? null });
  return error ? error.message : null;
}

/** Sobe a imagem da captura para o Storage (bucket privado "capturas"). */
export async function subirImagemCaptura(userId: string, arquivo: File): Promise<{ path: string | null; err: string | null }> {
  if (!supabase) return { path: null, err: "sem banco" };
  const ext = (arquivo.name.split(".").pop() || "png").toLowerCase().slice(0, 5);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("capturas").upload(path, arquivo, { contentType: arquivo.type || "image/png" });
  return error ? { path: null, err: error.message } : { path, err: null };
}

/** URL temporária (1h) para exibir uma imagem do bucket privado. */
export async function urlDaImagem(path: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.storage.from("capturas").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
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
    .select(
      "id, titulo, status, prazo, container_id, responsavel_id, descricao, criada_em, concluida_em, agendada_inicio, agendada_fim, duracao_min, recorrencia, recorre_ate, imagem_path",
    )
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
    nota_origem_id?: string | null;
    agendada_inicio?: string | null;
    agendada_fim?: string | null;
    concluida?: boolean;
    imagem_path?: string | null;
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
    nota_origem_id: campos.nota_origem_id ?? null,
    agendada_inicio: campos.agendada_inicio ?? null,
    agendada_fim: campos.agendada_fim ?? null,
    concluida_em: campos.concluida ? new Date().toISOString() : null,
    imagem_path: campos.imagem_path ?? null,
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

/** Edição geral da tarefa (painel lateral). */
export async function atualizarTarefa(
  id: string,
  campos: {
    titulo?: string;
    prazo?: string | null;
    container_id?: string | null;
    responsavel_id?: string | null;
    descricao?: string | null;
    status?: TarefaStatus;
    recorrencia?: Recorrencia | null;
    recorre_ate?: string | null;
    agendada_inicio?: string | null;
    agendada_fim?: string | null;
    duracao_min?: number | null;
  },
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_tarefas").update(campos).eq("id", id);
  return error ? error.message : null;
}

export async function excluirTarefa(id: string): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_tarefas").delete().eq("id", id);
  return error ? error.message : null;
}

/** Próxima data de uma recorrência a partir do prazo atual. */
export function proximaOcorrencia(prazoISO: string, rec: Recorrencia): string {
  if (rec === "mensal") {
    const [a, m, d] = prazoISO.split("-").map(Number);
    const alvo = new Date(a, m, 1); // mês seguinte
    const ultimo = new Date(a, m + 1, 0).getDate();
    alvo.setDate(Math.min(d, ultimo));
    return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}-${String(alvo.getDate()).padStart(2, "0")}`;
  }
  return somaDias(prazoISO, rec === "diaria" ? 1 : rec === "semanal" ? 7 : 14);
}

/** Conclui a tarefa; se for recorrente, cria a próxima ocorrência (até recorre_ate).
 *  Devolve a data da próxima ocorrência criada, ou null. */
export async function concluirTarefa(userId: string, t: Tarefa): Promise<string | null> {
  await mudarStatusTarefa(t.id, "concluida");
  if (!supabase || !t.recorrencia) return null;
  const base = t.prazo ?? hojeISO();
  const prox = proximaOcorrencia(base, t.recorrencia);
  if (t.recorre_ate && prox > t.recorre_ate) return null;
  await supabase.from("kairos_tarefas").insert({
    user_id: userId,
    titulo: t.titulo,
    status: "a_fazer",
    prazo: prox,
    container_id: t.container_id,
    duracao_min: t.duracao_min,
    recorrencia: t.recorrencia,
    recorre_ate: t.recorre_ate,
  });
  return prox;
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
  eventoId?: string | null,
): Promise<{ id: string | null; err: string | null }> {
  if (!supabase) return { id: null, err: "sem banco" };
  const { data, error } = await supabase
    .from("kairos_notas")
    .insert({
      user_id: userId,
      titulo,
      md,
      container_id: containerId ?? null,
      evento_id: eventoId ?? null,
    })
    .select("id")
    .single();
  return { id: data?.id ?? null, err: error ? error.message : null };
}

export async function listNotas(): Promise<Nota[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("kairos_notas")
    .select("id, titulo, md, container_id, evento_id, criada_em, atualizada_em")
    .order("atualizada_em", { ascending: false });
  return (data as Nota[]) ?? [];
}

export async function atualizarNota(
  id: string,
  campos: { titulo?: string; md?: string; container_id?: string | null },
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase
    .from("kairos_notas")
    .update({ ...campos, atualizada_em: new Date().toISOString() })
    .eq("id", id);
  return error ? error.message : null;
}

export async function excluirNota(id: string): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_notas").delete().eq("id", id);
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
    .select("id, titulo, inicio, fim, origem, container_id, dia_inteiro")
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

/** Coloca a tarefa num horário do dia (drag & drop) — o prazo acompanha o dia.
 *  A duração fica guardada para os próximos arrastos. */
export async function agendarTarefa(
  id: string,
  inicio: string,
  fim: string,
  prazoISO: string,
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const dur = Math.max(15, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000));
  const { error } = await supabase
    .from("kairos_tarefas")
    .update({ agendada_inicio: inicio, agendada_fim: fim, prazo: prazoISO, duracao_min: dur })
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
    .select("id, tarefa_id, titulo, feita, ordem")
    .eq("escopo", escopo)
    .eq("data", dataISO)
    .order("ordem");
  return (data as Prioridade[]) ?? [];
}

/** Uma prioridade escolhida: tarefa existente OU avulsa (texto livre). */
export type PrioEscolha = { tarefa_id?: string | null; titulo?: string | null; feita?: boolean };

/** Substitui as prioridades do dia/da semana pelas escolhidas (máx. 3, na ordem dada). */
export async function definirPrioridades(
  userId: string,
  escopo: EscopoPrio,
  dataISO: string,
  escolhas: PrioEscolha[],
): Promise<string | null> {
  if (!supabase) return "sem banco";
  const del = await supabase
    .from("kairos_prioridades")
    .delete()
    .eq("escopo", escopo)
    .eq("data", dataISO);
  if (del.error) return del.error.message;
  if (!escolhas.length) return null;
  const { error } = await supabase.from("kairos_prioridades").insert(
    escolhas.slice(0, 3).map((e, ordem) => ({
      user_id: userId,
      escopo,
      data: dataISO,
      tarefa_id: e.tarefa_id ?? null,
      titulo: e.titulo ?? null,
      feita: e.feita ?? false,
      ordem,
    })),
  );
  return error ? error.message : null;
}

/** Marca/desmarca uma prioridade avulsa como feita. */
export async function marcarPrioFeita(id: string, feita: boolean): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_prioridades").update({ feita }).eq("id", id);
  return error ? error.message : null;
}

/** Muda só o prazo da tarefa (reagendamento da revisão semanal). */
export async function mudarPrazoTarefa(id: string, prazoISO: string): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.from("kairos_tarefas").update({ prazo: prazoISO }).eq("id", id);
  return error ? error.message : null;
}

/** Quantos itens da Inbox foram triados no intervalo [deISO, ateISO) — datas locais. */
export async function contarTriadasEntre(deISO: string, ateISO: string): Promise<number> {
  if (!supabase) return 0;
  const de = new Date(`${deISO}T00:00`).toISOString();
  const ate = new Date(`${ateISO}T00:00`).toISOString();
  const { count } = await supabase
    .from("kairos_inbox")
    .select("id", { count: "exact", head: true })
    .gte("triado_em", de)
    .lt("triado_em", ate);
  return count ?? 0;
}

/** Ideias incubadas ainda dormindo: total e a data da que volta primeiro. */
export async function incubadasDormindo(): Promise<{ total: number; volta: string | null }> {
  if (!supabase) return { total: 0, volta: null };
  const { data, count } = await supabase
    .from("kairos_inbox")
    .select("incubada_ate", { count: "exact" })
    .is("triado_em", null)
    .gt("incubada_ate", hojeISO())
    .order("incubada_ate")
    .limit(1);
  return { total: count ?? 0, volta: (data?.[0]?.incubada_ate as string | undefined) ?? null };
}

/** Sequência de semanas consecutivas (antes da atual) com revisão semanal feita. */
export async function sequenciaRevisoes(): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase
    .from("kairos_rituais")
    .select("data")
    .eq("tipo", "revisao_semana")
    .order("data", { ascending: false })
    .limit(60);
  if (!data?.length) return 0;
  const semanas = new Set(data.map((r: { data: string }) => segundaDe(r.data)));
  const atual = segundaDe(hojeISO());
  let seq = 0;
  for (let i = 1; i <= 60; i++) {
    if (semanas.has(somaDias(atual, -7 * i))) seq++;
    else break;
  }
  return seq;
}

/** A revisão da semana atual já foi registrada? */
export async function revisaoDaSemanaFeita(): Promise<boolean> {
  if (!supabase) return false;
  const seg = segundaDe(hojeISO());
  const { data } = await supabase
    .from("kairos_rituais")
    .select("id")
    .eq("tipo", "revisao_semana")
    .gte("data", seg)
    .lte("data", somaDias(seg, 6))
    .limit(1);
  return !!data?.length;
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
