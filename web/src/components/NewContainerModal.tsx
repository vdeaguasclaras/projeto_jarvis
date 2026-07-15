"use client";

import { useState } from "react";
import IconePicker from "@/components/IconePicker";
import type { Container, Kind } from "@/lib/db";

const LABEL: Record<Kind, string> = { projeto: "Novo projeto", area: "Nova área", recurso: "Novo recurso" };

type Props = {
  kind: Kind;
  /** áreas existentes — um projeto pode nascer já vinculado a várias */
  areas: Container[];
  onCreate: (nome: string, icone: string | null, areaIds: string[]) => void;
  onClose: () => void;
};

export default function NewContainerModal({ kind, areas, onCreate, onClose }: Props) {
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState<string | null>(null);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const save = () => {
    if (nome.trim()) onCreate(nome.trim(), icone, areaIds);
  };
  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label={LABEL[kind]}>
          <div className="modal-pad">
            <h2>
              {icone ? `${icone} ` : ""}
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
            <div className="flab">Ícone (opcional)</div>
            <IconePicker valor={icone} onChange={setIcone} />
            {kind === "projeto" && areas.length > 0 && (
              <>
                <div className="flab">Parte de quais áreas? (opcional — pode ser mais de uma)</div>
                <div className="pillrow">
                  {areas.map((a) => (
                    <button
                      key={a.id}
                      className={`pill-opt${areaIds.includes(a.id) ? " on" : ""}`}
                      onClick={() =>
                        setAreaIds((prev) => (prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]))
                      }
                    >
                      {a.emoji ? `${a.emoji} ` : ""}
                      {a.nome}
                    </button>
                  ))}
                </div>
              </>
            )}
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
