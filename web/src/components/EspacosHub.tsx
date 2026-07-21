"use client";

import { ParaLista } from "@/components/ParaPage";
import type { Container, Kind, Tarefa } from "@/lib/db";

/** Espaços — hub provisório da Etapa A do redesign: reúne num lugar só o que
 *  a sidebar antiga espalhava (PARA, Notas, Grafo, Arquivo, criação).
 *  O grid 3 colunas do handoff (tela 11c) chega na Etapa F. */

type Props = {
  containers: Container[];
  arquivados: Container[];
  tarefas: Tarefa[];
  onOpen: (id: string) => void;
  onNotas: () => void;
  onGrafo: () => void;
  onArquivo: () => void;
  onNovo: (kind: Kind) => void;
};

export default function EspacosHub(p: Props) {
  return (
    <div className="view-in">
      <div className="pagewrap">
        <div className="hub-head">
          <h1>Espaços</h1>
          <div className="hub-links">
            <button className="pill-opt" onClick={p.onNotas}>✎ Notas</button>
            <button className="pill-opt" onClick={p.onGrafo}>⬡ Grafo</button>
            <button className="pill-opt" onClick={p.onArquivo}>▤ Arquivo{p.arquivados.length ? ` · ${p.arquivados.length}` : ""}</button>
            <span className="hub-sep" />
            <button className="pill-opt" onClick={() => p.onNovo("projeto")}>+ projeto</button>
            <button className="pill-opt" onClick={() => p.onNovo("area")}>+ área</button>
            <button className="pill-opt" onClick={() => p.onNovo("recurso")}>+ recurso</button>
          </div>
        </div>
      </div>
      <ParaLista
        containers={p.containers}
        arquivados={p.arquivados}
        tarefas={p.tarefas}
        onOpen={p.onOpen}
      />
    </div>
  );
}
