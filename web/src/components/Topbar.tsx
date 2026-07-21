"use client";

import { useMemo } from "react";
import { somaDias } from "@/lib/db";
import type { ViewId } from "@/lib/demo";

/** Header do redesign (10a). Nas visões de calendário: saudação em Lora +
 *  sequência 🔥, progresso do dia, navegação ‹ hoje › e o zoom temporal
 *  Dia/Semana/Mês/Ano. Nas demais (Tarefas, Notas, Grafo): título simples —
 *  a navegação primária vive no trilho/tab bar. */

type Props = {
  view: ViewId;
  title: [string, string];
  /** dia sendo visto na visão Dia (pode não ser hoje) */
  diaAtual: string;
  hoje: string;
  /** primeiro nome (login Google) — sem login a saudação fica sozinha */
  nome: string | null;
  seq: number;
  placar: { done: number; total: number };
  onView: (v: ViewId) => void;
  onNavDia: (novoDia: string) => void;
  onNavSemana: (delta: -1 | 0 | 1) => void;
};

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ZOOMS: { id: ViewId; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
];

function saudacaoDe(hora: number): string {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Topbar({ view, title, diaAtual, hoje, nome, seq, placar, onView, onNavDia, onNavSemana }: Props) {
  const calendario = view === "dia" || view === "semana" || view === "mes" || view === "ano";

  const rotuloDia = useMemo(() => {
    const [a, m, dd] = diaAtual.split("-").map(Number);
    const d = new Date(a, m - 1, dd);
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
  }, [diaAtual]);

  if (!calendario) {
    return (
      <header className="topbar">
        <div className="saudacao">
          <h1 className="titulo-pagina">{title[0]}</h1>
          <small>{title[1]}</small>
        </div>
      </header>
    );
  }

  const saud = saudacaoDe(new Date().getHours());
  const pct = Math.min(100, Math.round((placar.done / Math.max(placar.total, 1)) * 100));
  const navegavel = view === "dia" || view === "semana";
  const anterior = () => (view === "dia" ? onNavDia(somaDias(diaAtual, -1)) : onNavSemana(-1));
  const proximo = () => (view === "dia" ? onNavDia(somaDias(diaAtual, 1)) : onNavSemana(1));
  const paraHoje = () => (view === "dia" ? onNavDia(hoje) : onNavSemana(0));

  return (
    <header className="topbar">
      <div className="saudacao">
        {/* a hora do prerender difere da do cliente — só o texto muda, o React corrige */}
        <h1 className="saudacao-lora" suppressHydrationWarning>
          {saud}
          {nome ? `, ${nome}` : ""}
        </h1>
        <small>
          {view === "dia" ? rotuloDia : title[1]}
          {" · 🔥 "}
          {seq > 1 ? `${seq} dias` : seq === 1 ? "feito hoje" : "começa hoje"}
        </small>
      </div>
      <div className="prog-dia" title="Tarefas do dia concluídas">
        <span className="prog-barra">
          <i style={{ width: `${pct}%` }} />
        </span>
        <span className="prog-lbl">
          <b>{placar.done} de {placar.total}</b>
        </span>
      </div>
      <div className="topo-dir">
        {navegavel && (
          <div className="nav-hoje">
            <button onClick={anterior} aria-label={view === "dia" ? "Dia anterior" : "Semana anterior"}>‹</button>
            <button className="nav-hoje-lbl" onClick={paraHoje}>hoje</button>
            <button onClick={proximo} aria-label={view === "dia" ? "Próximo dia" : "Próxima semana"}>›</button>
          </div>
        )}
        <div className="views" role="tablist" aria-label="Zoom temporal">
          {ZOOMS.map((z) => (
            <button key={z.id} role="tab" className={view === z.id ? "active" : ""} onClick={() => onView(z.id)}>
              {z.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
