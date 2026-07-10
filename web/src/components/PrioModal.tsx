"use client";

import { useState } from "react";
import { hojeISO, type Container, type Tarefa } from "@/lib/db";

/** Escolha de até 3 prioridades entre as tarefas abertas.
 *  O Kairós propõe (pré-seleção), o usuário decide — regra do produto. */

type Props = {
  titulo: string;
  sub: string;
  tarefas: Tarefa[]; // candidatas, já ordenadas
  containers: Container[];
  iniciais: string[]; // ids pré-selecionados (salvos ou sugeridos)
  onSave: (ids: string[]) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
};

export default function PrioModal({ titulo, sub, tarefas, containers, iniciais, onSave, onClose, onToast }: Props) {
  const [sel, setSel] = useState<string[]>(iniciais.filter((id) => tarefas.some((t) => t.id === id)).slice(0, 3));
  const hoje = hojeISO();

  const toggle = (id: string) => {
    setSel((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        onToast("Máximo de 3 prioridades — desmarque uma antes");
        return prev;
      }
      return [...prev, id];
    });
  };

  const emojiDe = (t: Tarefa) => containers.find((c) => c.id === t.container_id)?.emoji;

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label={titulo}>
          <div className="modal-pad">
            <h2>★ {titulo}</h2>
            <p className="sub">{sub}</p>
            {tarefas.length === 0 ? (
              <p className="empty-hint">Nenhuma tarefa aberta — capture algo primeiro.</p>
            ) : (
              <div className="pillrow" style={{ gap: 6 }}>
                {tarefas.map((t) => (
                  <button
                    key={t.id}
                    className={`pill-opt${sel.includes(t.id) ? " on" : ""}`}
                    onClick={() => toggle(t.id)}
                  >
                    {emojiDe(t) ? `${emojiDe(t)} ` : ""}
                    {t.titulo}
                    {t.prazo && t.prazo < hoje ? " · venceu" : t.prazo === hoje ? " · hoje" : ""}
                  </button>
                ))}
              </div>
            )}
            <div className="modal-foot">
              <button className="btn ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn primary" onClick={() => onSave(sel)}>
                Salvar {sel.length ? `(${sel.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
