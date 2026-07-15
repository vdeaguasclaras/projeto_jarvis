"use client";

import { useMemo } from "react";
import { VIEWS, type ViewId } from "@/lib/demo";

/** Barra do topo — data/título e visões. A captura saiu daqui:
 *  virou o botão flutuante (CaptureFab), escolha do Raul (proposta C). */

type Props = {
  view: ViewId;
  title: [string, string];
  /** dia sendo visto na visão Dia (pode não ser hoje) */
  diaAtual: string;
  onView: (v: ViewId) => void;
  onToggleSidebar: () => void;
};

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export default function Topbar({ view, title, diaAtual, onView, onToggleSidebar }: Props) {
  const today = useMemo(() => {
    const [a, m, dd] = diaAtual.split("-").map(Number);
    const d = new Date(a, m - 1, dd);
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  }, [diaAtual]);

  return (
    <header className="topbar">
      <button className="sb-toggle" onClick={onToggleSidebar} aria-label="Mostrar/ocultar menu">
        ☰
      </button>
      <div className="date-title">
        {view === "dia" ? (
          <>
            {today}
            <small>{title[1]}</small>
          </>
        ) : (
          <>
            {title[0]}
            <small>{title[1]}</small>
          </>
        )}
      </div>
      <div className="views" role="tablist" aria-label="Visões">
        {VIEWS.map((v) => (
          <button key={v.id} role="tab" className={view === v.id ? "active" : ""} onClick={() => onView(v.id)}>
            {v.label} <kbd>{v.key}</kbd>
          </button>
        ))}
      </div>
    </header>
  );
}
