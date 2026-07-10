"use client";

import { useState } from "react";
import type { Kind } from "@/lib/db";

const LABEL: Record<Kind, string> = { projeto: "Novo projeto", area: "Nova área", recurso: "Novo recurso" };
const EMOJIS = ["🎯", "📊", "🏗️", "💰", "🏠", "👥", "🤝", "⚖️", "📚", "🧠", "💡", "🗂️", "🌱", "🛠️", "✈️", "❤️"];

type Props = {
  kind: Kind;
  onCreate: (nome: string, emoji: string | null) => void;
  onClose: () => void;
};

export default function NewContainerModal({ kind, onCreate, onClose }: Props) {
  const [nome, setNome] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const save = () => {
    if (nome.trim()) onCreate(nome.trim(), emoji);
  };
  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label={LABEL[kind]}>
          <div className="modal-pad">
            <h2>
              {emoji ? `${emoji} ` : ""}
              {LABEL[kind]}
            </h2>
            <p className="sub">Só o nome é obrigatório — o resto pode vir depois.</p>
            <input
              className="tri-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder={kind === "projeto" ? "ex.: Relatório anual 2026" : kind === "area" ? "ex.: Financeiro" : "ex.: Leituras"}
              autoFocus
            />
            <div className="flab">Símbolo (opcional)</div>
            <div className="pillrow">
              <button className={`pill-opt${emoji === null ? " on" : ""}`} onClick={() => setEmoji(null)}>
                sem
              </button>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className={`pill-opt${emoji === e ? " on" : ""}`}
                  style={{ padding: "3px 8px" }}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="modal-foot">
              <button className="btn ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn primary" onClick={save}>
                Criar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
