"use client";

import { useState } from "react";
import type { Container } from "@/lib/db";

/** Criar/editar um evento local do calendário (kairos_eventos). */

export type EventoForm = {
  id?: string;
  titulo: string;
  dataISO: string;
  hIni: number; // hora decimal
  hFim: number;
  container_id: string | null;
};

function paraInput(t: number): string {
  return `${String(Math.floor(t)).padStart(2, "0")}:${String(Math.round((t % 1) * 60)).padStart(2, "0")}`;
}
function deInput(v: string): number {
  const [h, m] = v.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}

type Props = {
  inicial: EventoForm;
  containers: Container[];
  onSave: (f: EventoForm) => void;
  onDelete?: () => void;
  onClose: () => void;
};

export default function EventoModal({ inicial, containers, onSave, onDelete, onClose }: Props) {
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [dataISO, setDataISO] = useState(inicial.dataISO);
  const [ini, setIni] = useState(paraInput(inicial.hIni));
  const [fim, setFim] = useState(paraInput(inicial.hFim));
  const [containerId, setContainerId] = useState<string | null>(inicial.container_id);

  const editando = !!inicial.id;
  const salvar = () => {
    if (!titulo.trim() || !dataISO) return;
    const hIni = deInput(ini);
    const hFim = Math.max(deInput(fim), hIni + 0.5); // pelo menos 30 min
    onSave({ ...inicial, titulo: titulo.trim(), dataISO, hIni, hFim, container_id: containerId });
  };

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label={editando ? "Editar evento" : "Novo evento"}>
          <div className="modal-pad">
            <h2>{editando ? "Editar evento" : "Novo evento"}</h2>
            <p className="sub">Evento local do Kairós — a sincronia com Google/Outlook chega na Fase 2.</p>
            <input
              className="tri-input"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              placeholder="ex.: Reunião de equipe"
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 140px" }}>
                <div className="flab">Dia</div>
                <input className="tri-input" type="date" value={dataISO} onChange={(e) => setDataISO(e.target.value)} />
              </div>
              <div style={{ flex: "0 1 100px" }}>
                <div className="flab">Início</div>
                <input className="tri-input" type="time" step={900} value={ini} onChange={(e) => setIni(e.target.value)} />
              </div>
              <div style={{ flex: "0 1 100px" }}>
                <div className="flab">Fim</div>
                <input className="tri-input" type="time" step={900} value={fim} onChange={(e) => setFim(e.target.value)} />
              </div>
            </div>
            <div className="flab">Projeto / área (opcional)</div>
            <select
              className="tri-input"
              value={containerId ?? ""}
              onChange={(e) => setContainerId(e.target.value || null)}
            >
              <option value="">— nenhum —</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ""}
                  {c.nome}
                </option>
              ))}
            </select>
            <div className="modal-foot">
              {editando && onDelete && (
                <button className="btn ghost" style={{ marginRight: "auto", color: "var(--today)" }} onClick={onDelete}>
                  Excluir
                </button>
              )}
              <button className="btn ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn primary" onClick={salvar}>
                {editando ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
