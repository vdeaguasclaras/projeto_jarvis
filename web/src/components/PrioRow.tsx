"use client";

/** Linha de prioridades do dia/da semana — chips ★, riscadas quando a tarefa foi concluída. */

export type PrioItem = { titulo: string; feita: boolean };

type Props = {
  label: string;
  items: PrioItem[];
  i?: number; // índice do stagger
  onDefinir: () => void;
};

export default function PrioRow({ label, items, i = 0.5, onDefinir }: Props) {
  return (
    <div className="prio-row stagger" style={{ ["--i" as string]: i }}>
      <span className="plabel">{label}</span>
      {items.length === 0 && <span className="empty-hint" style={{ margin: 0 }}>nenhuma definida ainda</span>}
      {items.map((p) => (
        <span key={p.titulo} className={`prio-chip${p.feita ? " done" : ""}`}>
          {p.titulo}
        </span>
      ))}
      <button className="p-set" onClick={onDefinir}>
        {items.length ? "Ajustar" : "Definir"} →
      </button>
    </div>
  );
}
