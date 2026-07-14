"use client";

import { useEffect, useMemo, useState } from "react";
import { dataLocalDe, hojeISO, listEventos, somaDias, type Evento, type Tarefa } from "@/lib/db";

/** Ano (restante do Marco 5) — modo densidade do protótipo v6:
 *  cada linha é um mês, alinhado por dia da semana; a cor mostra a
 *  densidade de compromissos (eventos + tarefas com prazo). */

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Props = {
  logged: boolean;
  tarefas: Tarefa[];
  onDia: (dataISO: string) => void;
};

export default function YearView({ logged, tarefas, onDia }: Props) {
  const hoje = hojeISO();
  const [ano, setAno] = useState(() => Number(hoje.slice(0, 4)));
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    if (!logged) return;
    listEventos(`${ano}-01-01`, `${ano + 1}-01-01`).then(setEventos);
  }, [logged, ano]);

  const porDia = useMemo(() => {
    const m = new Map<string, number>();
    const soma = (iso: string) => m.set(iso, (m.get(iso) ?? 0) + 1);
    for (const e of eventos) {
      if (e.dia_inteiro) {
        // conta cada dia coberto (fim exclusivo), limitado a 60 dias por segurança
        let dia = dataLocalDe(e.inicio);
        const fim = dataLocalDe(e.fim);
        for (let i = 0; dia < fim && i < 60; i++) {
          soma(dia);
          dia = somaDias(dia, 1);
        }
      } else {
        soma(dataLocalDe(e.inicio));
      }
    }
    for (const t of tarefas) if (t.prazo?.startsWith(`${ano}-`) && t.status !== "algum_dia") soma(t.prazo);
    return m;
  }, [eventos, tarefas, ano]);

  if (!logged) {
    return (
      <div className="view-in">
        <div className="soon">
          <h2>Ano</h2>
          <p>Entre com seu e-mail para ver a densidade do seu ano, mês a mês.</p>
          <span className="chip">Marco 5 · calendário local</span>
        </div>
      </div>
    );
  }

  return (
    <div className="view-in">
      <div className="weeknav stagger" style={{ ["--i" as string]: 0 }}>
        <button onClick={() => setAno(ano - 1)} aria-label="Ano anterior">‹</button>
        <button onClick={() => setAno(Number(hoje.slice(0, 4)))}>hoje</button>
        <button onClick={() => setAno(ano + 1)} aria-label="Próximo ano">›</button>
        <span className="range">{ano}</span>
      </div>
      <p className="year-note stagger" style={{ ["--i" as string]: 0.3 }}>
        Cada linha é um mês, alinhado por dia da semana. A cor mostra a densidade de compromissos — clique num dia para abrir a semana.
      </p>

      <div className="stagger" style={{ ["--i" as string]: 0.6 }}>
        {MESES.map((mn, m) => {
          const primeiro = new Date(ano, m, 1);
          const offset = (primeiro.getDay() + 6) % 7; // seg = 0
          const nDias = new Date(ano, m + 1, 0).getDate();
          return (
            <div key={mn} className="yearrow">
              <div className="mn">{mn}</div>
              <div className="yeardays">
                {Array.from({ length: 37 }, (_, i) => {
                  const d = i - offset + 1;
                  if (d < 1 || d > nDias) return <span key={i} className="yd empty" />;
                  const iso = `${ano}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const n = porDia.get(iso) ?? 0;
                  const wknd = i % 7 >= 5;
                  const cls = n >= 4 ? "d3" : n >= 2 ? "d2" : n === 1 ? "d1" : wknd ? "wknd" : "";
                  return (
                    <button
                      key={i}
                      className={`yd ${cls}${iso === hoje ? " today" : ""}`}
                      title={`${d} ${mn}${n ? ` · ${n} ${n === 1 ? "item" : "itens"}` : ""}`}
                      onClick={() => onDia(iso)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="yearlegend">
        <span>menos</span>
        <span className="yd" />
        <span className="yd d1" />
        <span className="yd d2" />
        <span className="yd d3" />
        <span>mais</span>
        <span style={{ marginLeft: 12 }}>■ contorno âmbar = hoje</span>
      </div>
    </div>
  );
}
