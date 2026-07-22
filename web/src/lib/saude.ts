import { hojeISO, somaDias, type Nota, type Tarefa } from "./db";

/** Saúde de uma área (tela 15b) — derivada, nunca coluna:
 *  - "atencao" (terracota): alguma tarefa do escopo venceu;
 *  - "quieta" (âmbar): nada aberto e nenhum movimento (conclusão/nota) há 3 semanas;
 *  - "em_dia" (verde): o resto. */

export type Saude = "em_dia" | "atencao" | "quieta";

export const SAUDE_LABEL: Record<Saude, string> = {
  em_dia: "em dia",
  atencao: "pede atenção",
  quieta: "quieta demais",
};

export function saudeDaArea(escopoIds: string[], tarefas: Tarefa[], notas: Nota[]): Saude {
  const hoje = hojeISO();
  const limite = somaDias(hoje, -21);
  const doEscopo = tarefas.filter((t) => t.container_id !== null && escopoIds.includes(t.container_id));
  const abertas = doEscopo.filter((t) => t.status !== "concluida" && t.status !== "algum_dia");
  if (abertas.some((t) => t.prazo !== null && t.prazo < hoje)) return "atencao";
  const mexeuTarefa = doEscopo.some(
    (t) => t.criada_em.slice(0, 10) >= limite || (t.concluida_em ?? "").slice(0, 10) >= limite,
  );
  const mexeuNota = notas.some(
    (n) => n.container_id !== null && escopoIds.includes(n.container_id) && n.atualizada_em.slice(0, 10) >= limite,
  );
  if (abertas.length === 0 && !mexeuTarefa && !mexeuNota) return "quieta";
  return "em_dia";
}
