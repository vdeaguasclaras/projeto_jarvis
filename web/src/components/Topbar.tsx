"use client";

import { useMemo, useState } from "react";
import { VIEWS, type ViewId } from "@/lib/demo";
import { parseCapture } from "@/lib/parser";

type Props = {
  view: ViewId;
  title: [string, string];
  onView: (v: ViewId) => void;
  onToggleSidebar: () => void;
  onCapture: (text: string) => void;
};

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export default function Topbar({ view, title, onView, onToggleSidebar, onCapture }: Props) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => (text.trim() ? parseCapture(text) : null), [text]);

  const today = useMemo(() => {
    const d = new Date();
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  }, []);

  const submit = () => {
    if (!text.trim()) return;
    onCapture(text);
    setText("");
  };

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
          <button
            key={v.id}
            role="tab"
            className={view === v.id ? "active" : ""}
            onClick={() => onView(v.id)}
          >
            {v.label} <kbd>{v.key}</kbd>
          </button>
        ))}
      </div>
      <div className="capture">
        <span className="plus">+</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setText("");
          }}
          placeholder="Capturar… ex.: revisar edital dia 24 14h @Ana #Sede /Financeiro"
          autoComplete="off"
        />
        {parsed && (
          <div className="capture-chips">
            <span className="chip muted">{parsed.title}</span>
            {parsed.date && <span className="chip">📅 {parsed.date}</span>}
            {parsed.time && <span className="chip">🕐 {parsed.time}</span>}
            {parsed.people.map((p) => (
              <span key={p} className="chip person">
                @{p}
              </span>
            ))}
            {parsed.project && <span className="chip">▶ {parsed.project}</span>}
            {parsed.area && <span className="chip">▣ {parsed.area}</span>}
            {!parsed.project && !parsed.area && <span className="chip muted">→ Inbox</span>}
            <div className="capture-hint">
              Enter captura · @pessoa · #projeto · /área · datas: sexta, 24/07, dia 24
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
