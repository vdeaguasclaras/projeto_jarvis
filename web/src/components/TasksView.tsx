"use client";

import { useState } from "react";
import { hojeISO, somaDias, type Container, type Tarefa, type TarefaStatus } from "@/lib/db";
import { normalizar } from "@/lib/parser";

type Props = {
  tarefas: Tarefa[];
  containers: Container[];
  logged: boolean;
  onConclude: (id: string) => void;
  onEdit: (t: Tarefa) => void;
  onToast: (msg: string) => void;
};

const GRUPOS: [TarefaStatus, string][] = [
  ["a_fazer", "A fazer"],
  ["em_andamento", "Em andamento"],
  ["em_espera", "Em espera"],
  ["algum_dia", "Algum dia"],
  ["concluida", "Concluídas hoje"],
];

type FiltroPrazo = "todas" | "hoje" | "semana" | "vencidas" | "sem";
const FILTROS_PRAZO: [FiltroPrazo, string][] = [
  ["todas", "todas"],
  ["hoje", "hoje"],
  ["semana", "esta semana"],
  ["vencidas", "vencidas"],
  ["sem", "sem prazo"],
];

const REC_LABEL = { diaria: "diária", semanal: "semanal", quinzenal: "quinzenal", mensal: "mensal" } as const;

function prazoChip(prazo: string | null): { txt: string; late: boolean } | null {
  if (!prazo) return null;
  const hoje = hojeISO();
  const txt = prazo === hoje ? "hoje" : prazo.split("-").reverse().slice(0, 2).join("/");
  return { txt, late: prazo < hoje };
}

export default function TasksView({ tarefas, containers, logged, onConclude, onEdit, onToast }: Props) {
  const [busca, setBusca] = useState("");
  const [fPrazo, setFPrazo] = useState<FiltroPrazo>("todas");
  const [fContainer, setFContainer] = useState<string>("todos");

  const containerDe = (id: string | null) => containers.find((c) => c.id === id) ?? null;
  const hoje = hojeISO();
  const fimSemana = somaDias(hoje, 6 - ((new Date().getDay() + 6) % 7)); // domingo desta semana

  if (!logged) {
    return (
      <div className="view-in">
        <div className="soon">
          <h2>Tarefas</h2>
          <p>Entre com seu e-mail para ver suas tarefas reais — elas nascem da triagem da Inbox (check do dia).</p>
          <span className="chip">capturar → organizar → fazer</span>
        </div>
      </div>
    );
  }

  // Filtros combinados (busca + prazo + grupo) — pedido do Raul
  const passaFiltros = (t: Tarefa): boolean => {
    if (busca && !normalizar(t.titulo).includes(normalizar(busca))) return false;
    if (fContainer !== "todos" && t.container_id !== (fContainer === "nenhum" ? null : fContainer)) return false;
    if (fPrazo === "hoje" && t.prazo !== hoje) return false;
    if (fPrazo === "semana" && (t.prazo === null || t.prazo < hoje || t.prazo > fimSemana)) return false;
    if (fPrazo === "vencidas" && (t.prazo === null || t.prazo >= hoje)) return false;
    if (fPrazo === "sem" && t.prazo !== null) return false;
    return true;
  };

  const filtrando = busca !== "" || fPrazo !== "todas" || fContainer !== "todos";
  const pill = (on: boolean) => `pill-opt${on ? " on" : ""}`;

  return (
    <div className="view-in gtd">
      <div className="task-filters stagger" style={{ ["--i" as string]: 0 }}>
        <input
          className="note-search"
          placeholder="Filtrar por texto…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="note-search" style={{ flex: "0 1 190px" }} value={fContainer} onChange={(e) => setFContainer(e.target.value)}>
          <option value="todos">todos os grupos</option>
          <option value="nenhum">sem grupo</option>
          {containers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji ? `${c.emoji} ` : ""}
              {c.nome}
            </option>
          ))}
        </select>
        <div className="pillrow" style={{ margin: 0 }}>
          {FILTROS_PRAZO.map(([f, label]) => (
            <button key={f} className={pill(fPrazo === f)} onClick={() => setFPrazo(f)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {GRUPOS.map(([status, label]) => {
        const itens = tarefas
          .filter((t) =>
            status === "concluida"
              ? t.status === "concluida" && (t.concluida_em ?? "").slice(0, 10) === hoje
              : t.status === status,
          )
          .filter(passaFiltros);
        if (!itens.length && (filtrando || status === "em_andamento" || status === "algum_dia")) return null;
        return (
          <div key={status}>
            <h3>
              {label} <span className="count">{itens.length}</span>
            </h3>
            {itens.length === 0 && (
              <p className="empty-hint">
                {status === "a_fazer"
                  ? "Nada aqui — capture algo e faça o check do dia."
                  : status === "concluida"
                    ? "Nenhuma concluída hoje ainda."
                    : "Vazio."}
              </p>
            )}
            {itens.map((t) => {
              const pc = prazoChip(t.prazo);
              const cont = containerDe(t.container_id);
              const feita = t.status === "concluida";
              return (
                <div key={t.id} className={`todo${feita ? " done" : ""}`}>
                  <button
                    className="box"
                    role="checkbox"
                    aria-checked={feita}
                    onClick={() => (feita ? onToast("Já concluída ✓") : onConclude(t.id))}
                  >
                    ✓
                  </button>
                  <button className="txt txt-btn" onClick={() => onEdit(t)} title="Editar tarefa">
                    {t.titulo}
                    <div className="chips">
                      {cont && (
                        <span className="chip">
                          {cont.emoji ? `${cont.emoji} ` : ""}
                          {cont.nome}
                        </span>
                      )}
                      {pc && (
                        <span className="chip muted" style={pc.late ? { color: "var(--today)" } : undefined}>
                          {pc.late ? `venceu ${pc.txt}` : pc.txt}
                        </span>
                      )}
                      {t.recorrencia && <span className="chip muted">⟳ {REC_LABEL[t.recorrencia]}</span>}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
