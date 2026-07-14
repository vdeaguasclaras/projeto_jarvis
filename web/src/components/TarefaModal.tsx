"use client";

import { useState } from "react";
import type { Container, Recorrencia, Tarefa, TarefaStatus } from "@/lib/db";

/** Edição de tarefa — inclui a recorrência pedida pelo Raul:
 *  diária/semanal/quinzenal/mensal + até quando repetir.
 *  Concluir uma recorrente cria a próxima ocorrência automaticamente. */

export type TarefaEdicao = {
  titulo: string;
  prazo: string | null;
  container_id: string | null;
  status: TarefaStatus;
  recorrencia: Recorrencia | null;
  recorre_ate: string | null;
};

type Props = {
  tarefa: Tarefa;
  containers: Container[];
  onSave: (campos: TarefaEdicao) => void;
  onDelete: () => void;
  onClose: () => void;
};

const RECORRENCIAS: [Recorrencia | null, string][] = [
  [null, "não repete"],
  ["diaria", "diária"],
  ["semanal", "semanal"],
  ["quinzenal", "quinzenal"],
  ["mensal", "mensal"],
];

const STATUS: [TarefaStatus, string][] = [
  ["a_fazer", "a fazer"],
  ["em_andamento", "em andamento"],
  ["em_espera", "em espera"],
  ["algum_dia", "algum dia"],
];

export default function TarefaModal({ tarefa, containers, onSave, onDelete, onClose }: Props) {
  const [titulo, setTitulo] = useState(tarefa.titulo);
  const [prazo, setPrazo] = useState(tarefa.prazo ?? "");
  const [containerId, setContainerId] = useState(tarefa.container_id);
  const [status, setStatus] = useState<TarefaStatus>(tarefa.status === "concluida" ? "a_fazer" : tarefa.status);
  const [rec, setRec] = useState<Recorrencia | null>(tarefa.recorrencia);
  const [ate, setAte] = useState(tarefa.recorre_ate ?? "");

  const pill = (on: boolean) => `pill-opt${on ? " on" : ""}`;

  const salvar = () => {
    if (!titulo.trim()) return;
    onSave({
      titulo: titulo.trim(),
      prazo: prazo || null,
      container_id: containerId,
      status,
      recorrencia: rec,
      recorre_ate: rec ? ate || null : null,
    });
  };

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label="Editar tarefa">
          <div className="modal-pad">
            <h2>Editar tarefa</h2>
            <p className="sub">Título, grupo, prazo, status — e recorrência, se ela se repete.</p>

            <input
              className="tri-input"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              autoFocus
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 160px" }}>
                <div className="flab">Projeto / área</div>
                <select className="tri-input" value={containerId ?? ""} onChange={(e) => setContainerId(e.target.value || null)}>
                  <option value="">— nenhum —</option>
                  {containers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji ? `${c.emoji} ` : ""}
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "0 1 150px" }}>
                <div className="flab">Prazo</div>
                <input className="tri-input" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
            </div>

            <div className="flab">Status</div>
            <div className="pillrow">
              {STATUS.map(([s, label]) => (
                <button key={s} className={pill(status === s)} onClick={() => setStatus(s)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flab">Recorrência</div>
            <div className="pillrow">
              {RECORRENCIAS.map(([r, label]) => (
                <button key={String(r)} className={pill(rec === r)} onClick={() => setRec(r)}>
                  {label}
                </button>
              ))}
            </div>
            {rec && (
              <>
                <div className="flab">Repetir até (opcional — vazio repete sem fim)</div>
                <input className="tri-input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
                <p className="year-note" style={{ marginTop: -4 }}>
                  Ao concluir, a próxima ocorrência nasce sozinha com o prazo seguinte.
                </p>
              </>
            )}

            <div className="modal-foot">
              <button className="btn ghost" style={{ marginRight: "auto", color: "var(--today)" }} onClick={onDelete}>
                Excluir
              </button>
              <button className="btn ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn primary" onClick={salvar}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
