"use client";

import { useState } from "react";
import type { Kind } from "@/lib/db";

const LABEL: Record<Kind, string> = { projeto: "Novo projeto", area: "Nova área", recurso: "Novo recurso" };

type Props = {
  kind: Kind;
  onCreate: (nome: string) => void;
  onClose: () => void;
};

export default function NewContainerModal({ kind, onCreate, onClose }: Props) {
  const [nome, setNome] = useState("");
  const save = () => {
    if (nome.trim()) onCreate(nome.trim());
  };
  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label={LABEL[kind]}>
          <div className="modal-pad">
            <h2>{LABEL[kind]}</h2>
            <p className="sub">Só o nome é obrigatório — o resto pode vir depois.</p>
            <input
              className="tri-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder={kind === "projeto" ? "ex.: Relatório anual 2026" : kind === "area" ? "ex.: Financeiro" : "ex.: Leituras"}
              autoFocus
            />
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
