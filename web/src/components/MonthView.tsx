"use client";

import { useEffect, useMemo, useState } from "react";
import { hojeISO, listEventos, segundaDe, somaDias, type Evento, type Tarefa } from "@/lib/db";

/** Mês (restante do Marco 5) — grade mensal do protótipo v6 sobre dados reais:
 *  eventos + tarefas com prazo no dia; clique no dia abre a Semana correspondente. */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const WD = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function primeiroDoMes(dataISO: string): string {
  return `${dataISO.slice(0, 7)}-01`;
}

function somaMeses(mesISO: string, n: number): string {
  const [a, m] = mesISO.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

type Props = {
  logged: boolean;
  tarefas: Tarefa[];
  onDia: (dataISO: string) => void;
  onToast: (msg: string) => void;
};

export default function MonthView({ logged, tarefas, onDia, onToast }: Props) {
  const hoje = hojeISO();
  const [mes, setMes] = useState(() => primeiroDoMes(hoje));
  const [eventos, setEventos] = useState<Evento[]>([]);

  // A grade cobre da segunda antes do dia 1 até o domingo depois do fim do mês
  const gradeInicio = segundaDe(mes);
  const proxMes = somaMeses(mes, 1);
  const gradeFim = somaDias(segundaDe(somaDias(proxMes, -1)), 7); // exclusivo
  const dias = useMemo(() => {
    const out: string[] = [];
    for (let d = gradeInicio; d < gradeFim; d = somaDias(d, 1)) out.push(d);
    return out;
  }, [gradeInicio, gradeFim]);

  useEffect(() => {
    if (!logged) return;
    listEventos(gradeInicio, gradeFim).then(setEventos);
  }, [logged, gradeInicio, gradeFim]);

  if (!logged) {
    return (
      <div className="view-in">
        <div className="soon">
          <h2>Mês</h2>
          <p>Entre com seu e-mail para ver o seu mês real — eventos e prazos, dia a dia.</p>
          <span className="chip">Marco 5 · calendário local</span>
        </div>
      </div>
    );
  }

  const [ano, m] = mes.split("-").map(Number);

  const dataLocal = (ts: string) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  type Item = { titulo: string; classe: string };
  const itensDe = (dia: string): Item[] => [
    ...eventos.filter((e) => dataLocal(e.inicio) === dia).map((e) => ({ titulo: e.titulo, classe: "" })),
    ...tarefas
      .filter((t) => t.prazo === dia && t.status !== "algum_dia")
      .map((t) => ({ titulo: t.titulo, classe: t.status === "concluida" ? "task done" : "task" })),
  ];

  return (
    <div className="view-in">
      <div className="weeknav stagger" style={{ ["--i" as string]: 0 }}>
        <button onClick={() => setMes(somaMeses(mes, -1))} aria-label="Mês anterior">‹</button>
        <button onClick={() => setMes(primeiroDoMes(hoje))}>hoje</button>
        <button onClick={() => setMes(somaMeses(mes, 1))} aria-label="Próximo mês">›</button>
        <span className="range">
          {MESES[m - 1].replace(/^./, (c) => c.toUpperCase())} de {ano}
        </span>
      </div>

      <div className="monthgrid stagger" style={{ ["--i" as string]: 0.5 }}>
        {WD.map((w) => (
          <div key={w} className="wd">
            {w}
          </div>
        ))}
        {dias.map((dia) => {
          const itens = itensDe(dia);
          const doMes = dia.slice(0, 7) === mes.slice(0, 7);
          return (
            <button
              key={dia}
              className={`mday${doMes ? "" : " out"}${dia === hoje ? " today" : ""}`}
              onClick={() => {
                onDia(dia);
                onToast(`Semana de ${Number(dia.slice(8))}/${Number(dia.slice(5, 7))} aberta`);
              }}
            >
              <span className="n">{Number(dia.slice(8))}</span>
              {itens.slice(0, 2).map((it, i) => (
                <div key={i} className={`mevt ${it.classe}`}>
                  {it.titulo}
                </div>
              ))}
              {itens.length > 2 && <div className="mmore">+ {itens.length - 2} itens</div>}
              {itens.length > 0 && (
                <span className="mdots">
                  {itens.slice(0, 4).map((it, i) => (
                    <span key={i} className={`mdot${it.classe.startsWith("task") ? " task" : ""}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
