"use client";

import { useMemo, useState } from "react";
import { VIEWS, type ViewId } from "@/lib/demo";
import { normalizar, parseCapture, tokenDe } from "@/lib/parser";
import type { Container, Pessoa } from "@/lib/db";

type Props = {
  view: ViewId;
  title: [string, string];
  /** dia sendo visto na visão Dia (pode não ser hoje) */
  diaAtual: string;
  containers: Container[];
  pessoas: Pessoa[];
  onView: (v: ViewId) => void;
  onToggleSidebar: () => void;
  onCapture: (text: string) => void;
};

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

type Sugestao = { insere: string; mostra: string; tipo: string };

export default function Topbar({ view, title, diaAtual, containers, pessoas, onView, onToggleSidebar, onCapture }: Props) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => (text.trim() ? parseCapture(text) : null), [text]);

  const today = useMemo(() => {
    const [a, m, dd] = diaAtual.split("-").map(Number);
    const d = new Date(a, m - 1, dd);
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  }, [diaAtual]);

  // Autocompletar: sugestões para o token em digitação (@pessoa, #projeto, /área)
  const ac = useMemo(() => {
    const m = text.match(/(^|\s)([@#\/])([\wÀ-ú-]*)$/);
    if (!m) return null;
    const [, , trigger, partial] = m;
    const alvo = normalizar(partial);
    let cands: Sugestao[] = [];
    if (trigger === "@") {
      cands = pessoas
        .filter((p) => normalizar(p.nome).startsWith(alvo))
        .map((p) => ({ insere: tokenDe(p.nome), mostra: p.nome, tipo: "pessoa" }));
    } else {
      const kind = trigger === "#" ? "projeto" : "area";
      cands = containers
        .filter((c) => c.kind === kind && (alvo === "" || normalizar(c.nome).includes(alvo)))
        .map((c) => ({ insere: tokenDe(c.nome), mostra: `${c.emoji ? c.emoji + " " : ""}${c.nome}`, tipo: kind === "area" ? "área" : kind }));
    }
    if (!cands.length) return null;
    return { start: m.index! + m[1].length, trigger, itens: cands.slice(0, 4) };
  }, [text, containers, pessoas]);

  const completar = (s: Sugestao) => {
    if (!ac) return;
    setText(text.slice(0, ac.start) + ac.trigger + s.insere + " ");
  };

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
          <button key={v.id} role="tab" className={view === v.id ? "active" : ""} onClick={() => onView(v.id)}>
            {v.label} <kbd>{v.key}</kbd>
          </button>
        ))}
      </div>
      <div className="capture">
        <span className="plus">+</span>
        <input
          id="captura-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab" && ac) {
              e.preventDefault();
              completar(ac.itens[0]);
              return;
            }
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setText("");
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Capturar (atalho: c)… ex.: revisar edital dia 24 14h @Ana #Sede"
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
            {parsed.project && <span className="chip">▶ {parsed.project.replace(/-/g, " ")}</span>}
            {parsed.area && <span className="chip">▣ {parsed.area.replace(/-/g, " ")}</span>}
            {!parsed.project && !parsed.area && <span className="chip muted">→ Inbox</span>}
            {ac && (
              <div className="ac-list">
                {ac.itens.map((s, i) => (
                  <button
                    key={s.insere}
                    className={`ac-item${i === 0 ? " sel" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      completar(s);
                    }}
                  >
                    {ac.trigger}
                    {s.mostra}
                    <span className="k">{s.tipo}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="capture-hint">
              {ac
                ? "Tab completa a primeira sugestão"
                : "Enter captura · com #projeto ou /área vira tarefa direto, sem passar pela Inbox"}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
