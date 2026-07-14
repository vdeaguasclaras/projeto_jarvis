"use client";

import { useState } from "react";
import { cobreDia, somaDias, type Evento, type Tarefa } from "@/lib/db";
import TimeGrid, { arrasteToque, blocoDeEvento, blocoDeTarefa, hhmm, type Bloco, type DropInfo } from "@/components/TimeGrid";
import PrioRow, { type PrioItem } from "@/components/PrioRow";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function numeroSemanaISO(dataISO: string): number {
  const [a, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7)); // quinta da semana
  const ano1 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - ano1.getTime()) / 86400000 + 1) / 7);
}

function rotulo(inicioISO: string): [string, string] {
  const fimISO = somaDias(inicioISO, 6);
  const [, m1, d1] = inicioISO.split("-").map(Number);
  const [a2, m2, d2] = fimISO.split("-").map(Number);
  const faixa =
    m1 === m2 ? `${d1} – ${d2} de ${MESES[m1 - 1]}` : `${d1} de ${MESES[m1 - 1]} – ${d2} de ${MESES[m2 - 1]}`;
  return [faixa, `Semana ${numeroSemanaISO(inicioISO)} · ${MESES[m2 - 1]} de ${a2}`];
}

type Props = {
  logged: boolean;
  hoje: string;
  weekStart: string; // segunda-feira ISO
  eventos: Evento[];
  tarefas: Tarefa[];
  prioridades: PrioItem[];
  onNav: (deltaSemanas: number | "hoje") => void;
  onToast: (msg: string) => void;
  onSlotClick: (dataISO: string, hora: number) => void;
  onDrop: (info: DropInfo, dataISO: string, hora: number) => void;
  onEventoClick: (id: string) => void;
  onConcluirTarefa: (id: string) => void;
  onDefinirPrio: () => void;
};

export default function WeekView({
  logged,
  hoje,
  weekStart,
  eventos,
  tarefas,
  prioridades,
  onNav,
  onToast,
  onSlotClick,
  onDrop,
  onEventoClick,
  onConcluirTarefa,
  onDefinirPrio,
}: Props) {
  const [trayAberta, setTrayAberta] = useState(false);
  if (!logged) {
    return (
      <div className="view-in">
        <div className="soon">
          <h2>Semana</h2>
          <p>Entre com seu e-mail para ver a sua semana real — eventos e blocos de tarefa arrastáveis.</p>
          <span className="chip">Marco 5 · calendário local</span>
        </div>
      </div>
    );
  }

  const dias = Array.from({ length: 7 }, (_, i) => somaDias(weekStart, i));
  const fimSemana = somaDias(weekStart, 6);
  const [faixa, sub] = rotulo(weekStart);

  const blocos: Bloco[] = [
    ...eventos.filter((e) => !e.dia_inteiro).map(blocoDeEvento),
    ...tarefas.map(blocoDeTarefa).filter((b): b is Bloco => b !== null),
  ].filter((b) => b.dataISO >= weekStart && b.dataISO <= fimSemana);

  // Dia inteiro: um chip por dia coberto na semana
  const WD = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
  const diaInteiro = dias.flatMap((dia, i) =>
    eventos.filter((e) => cobreDia(e, dia)).map((e) => ({ e, rotulo: `${WD[i]} ${Number(dia.slice(8))}` })),
  );

  // Bandeja: abertas sem horário — com prazo na semana, vencidas ou ainda sem prazo
  const semHorario = tarefas
    .filter(
      (t) =>
        (t.status === "a_fazer" || t.status === "em_andamento") &&
        !t.agendada_inicio &&
        (t.prazo === null || t.prazo <= fimSemana),
    )
    .slice(0, 12);

  return (
    <div className="view-in">
      <div className="weeknav stagger" style={{ ["--i" as string]: 0 }}>
        <button onClick={() => onNav(-1)} aria-label="Semana anterior">‹</button>
        <button onClick={() => onNav("hoje")}>hoje</button>
        <button onClick={() => onNav(1)} aria-label="Próxima semana">›</button>
        <span className="range">
          {faixa} <small>{sub}</small>
        </span>
      </div>

      <PrioRow label="Prioridades da semana" items={prioridades} i={0.3} onDefinir={onDefinirPrio} />

      {diaInteiro.length > 0 && (
        <div className="allday stagger" style={{ ["--i" as string]: 0.35 }}>
          <span className="plabel">O dia todo</span>
          {diaInteiro.map(({ e, rotulo }, i) => (
            <button key={`${e.id}-${i}`} className={`allday-chip${e.origem === "google" ? " g" : ""}`} onClick={() => onEventoClick(e.id)}>
              <small>{rotulo}</small> {e.titulo}
            </button>
          ))}
        </div>
      )}

      {semHorario.length > 0 && (
        <div className={`tray stagger${trayAberta ? "" : " fechada"}`} style={{ ["--i" as string]: 0.4 }}>
          <button className="tray-toggle" onClick={() => setTrayAberta((v) => !v)}>
            ☐ {semHorario.length} sem horário {trayAberta ? "▴" : "▾"}
          </button>
          {trayAberta && semHorario.map((t) => (
            <span
              key={t.id}
              className="traychip"
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ tipo: "tarefa", id: t.id, durMin: t.duracao_min ?? 60 } satisfies DropInfo),
                )
              }
              onPointerDown={(e) => arrasteToque(e, { tipo: "tarefa", id: t.id, durMin: t.duracao_min ?? 60 }, t.titulo, onDrop)}
              onClick={() => onToast("Arraste para um dia da grade — o prazo acompanha")}
            >
              {t.titulo}
            </span>
          ))}
          {trayAberta && <span className="empty-hint" style={{ margin: 0 }}>arraste para um dia — o prazo acompanha</span>}
        </div>
      )}

      <TimeGrid
        dias={dias}
        hoje={hoje}
        blocos={blocos}
        semana
        onSlotClick={onSlotClick}
        onDrop={onDrop}
        onBlocoClick={(b) =>
          b.tipo === "evento"
            ? onEventoClick(b.id)
            : onToast(b.feita ? "Já concluída ✓" : `${b.titulo} · ${hhmm(b.inicio)} — duplo clique conclui, arraste para mover`)
        }
        onBlocoDblClick={(b) => b.tipo === "tarefa" && !b.feita && onConcluirTarefa(b.id)}
      />
    </div>
  );
}
