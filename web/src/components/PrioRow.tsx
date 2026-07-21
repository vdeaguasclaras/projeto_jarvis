"use client";

import { arrasteToque, type DropInfo } from "@/components/TimeGrid";

/** Linha de prioridades do dia/da semana — agora acionáveis (pedido do Raul):
 *  ✓ conclui, o texto abre o painel da tarefa, e dá para arrastar para a grade.
 *  Prioridade avulsa (sem tarefa) marca/desmarca feita no próprio chip. */

export type PrioItem = {
  id: string; // id da prioridade
  tarefaId: string | null; // null = avulsa (texto livre)
  titulo: string;
  feita: boolean;
  durMin: number;
  agendada: boolean;
};

type Props = {
  label: string;
  items: PrioItem[];
  i?: number; // índice do stagger
  onDefinir: () => void;
  /** clique no texto: tarefa → painel; avulsa → marca feita */
  onAbrir: (p: PrioItem) => void;
  /** clique no ✓/★: conclui a tarefa ou marca a avulsa */
  onConcluir: (p: PrioItem) => void;
  onDrop?: (info: DropInfo, dataISO: string, hora: number) => void;
};

export default function PrioRow({ label, items, i = 0.5, onDefinir, onAbrir, onConcluir, onDrop }: Props) {
  return (
    <div className="prio-row stagger" style={{ ["--i" as string]: i }}>
      <span className="plabel">{label}</span>
      {items.length === 0 && <span className="empty-hint" style={{ margin: 0 }}>nenhuma definida ainda</span>}
      {items.map((p) => (
        <span
          key={p.id}
          className={`prio-chip acion${p.feita ? " done" : ""}`}
          draggable={!!p.tarefaId && !p.feita}
          onDragStart={(e) => {
            if (!p.tarefaId) return;
            e.dataTransfer.setData(
              "application/json",
              JSON.stringify({ tipo: "tarefa", id: p.tarefaId, durMin: p.durMin } satisfies DropInfo),
            );
          }}
          onPointerDown={(e) => {
            if (p.tarefaId && !p.feita) arrasteToque(e, { tipo: "tarefa", id: p.tarefaId, durMin: p.durMin }, p.titulo, onDrop);
          }}
          title={
            p.feita
              ? "Feita ✓"
              : p.tarefaId
                ? "Clique para abrir · ✓ conclui · arraste para a grade"
                : "Prioridade avulsa — clique no ✓ quando fizer"
          }
        >
          <button className="prio-do" aria-label={p.feita ? "Feita" : "Concluir"} onClick={() => !p.feita && onConcluir(p)}>
            {p.feita ? "✓" : "★"}
          </button>
          <button className="prio-open" onClick={() => onAbrir(p)}>
            {p.titulo}
          </button>
        </span>
      ))}
      <button className="p-set" onClick={onDefinir}>
        {items.length ? "Ajustar" : "Definir"} →
      </button>
    </div>
  );
}
