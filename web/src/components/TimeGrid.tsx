"use client";

import { useEffect, useState, type DragEvent, type MouseEvent } from "react";
import type { Evento, Tarefa } from "@/lib/db";

/** Grade de horas do Dia e da Semana — eventos reais + blocos de tarefa agendada. */

export type Bloco = {
  id: string;
  tipo: "evento" | "tarefa";
  titulo: string;
  dataISO: string;
  inicio: number; // hora decimal (10.5 = 10h30)
  fim: number;
  classe: "" | "g" | "o" | "task";
  feita?: boolean;
  durMin: number;
};

export type DropInfo = { tipo: "evento" | "tarefa"; id: string; durMin: number };

const ROW = 52;

export function hhmm(t: number): string {
  return `${Math.floor(t)}:${String(Math.round((t % 1) * 60)).padStart(2, "0")}`;
}

function dataLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Converte dia local + hora decimal em timestamp ISO (UTC) para o banco. */
export function isoDe(dataISO: string, hora: number): string {
  const [a, m, d] = dataISO.split("-").map(Number);
  return new Date(a, m - 1, d, Math.floor(hora), Math.round((hora % 1) * 60)).toISOString();
}

export function blocoDeEvento(ev: Evento): Bloco {
  const i = new Date(ev.inicio);
  const f = new Date(ev.fim);
  return {
    id: ev.id,
    tipo: "evento",
    titulo: ev.titulo,
    dataISO: dataLocalISO(i),
    inicio: i.getHours() + i.getMinutes() / 60,
    fim: Math.max(f.getHours() + f.getMinutes() / 60, i.getHours() + i.getMinutes() / 60 + 0.5),
    classe: ev.origem === "google" ? "g" : ev.origem === "outlook" ? "o" : "",
    durMin: Math.max(30, Math.round((f.getTime() - i.getTime()) / 60000)),
  };
}

export function blocoDeTarefa(t: Tarefa): Bloco | null {
  if (!t.agendada_inicio || !t.agendada_fim) return null;
  const i = new Date(t.agendada_inicio);
  const f = new Date(t.agendada_fim);
  return {
    id: t.id,
    tipo: "tarefa",
    titulo: t.titulo,
    dataISO: dataLocalISO(i),
    inicio: i.getHours() + i.getMinutes() / 60,
    fim: Math.max(f.getHours() + f.getMinutes() / 60, i.getHours() + i.getMinutes() / 60 + 0.5),
    classe: "task",
    feita: t.status === "concluida",
    durMin: Math.max(30, Math.round((f.getTime() - i.getTime()) / 60000)),
  };
}

type Props = {
  dias: string[]; // datas ISO das colunas
  hoje: string;
  blocos: Bloco[];
  semana?: boolean;
  onSlotClick?: (dataISO: string, hora: number) => void;
  onDrop?: (info: DropInfo, dataISO: string, hora: number) => void;
  onBlocoClick?: (b: Bloco) => void;
  onBlocoDblClick?: (b: Bloco) => void;
};

export default function TimeGrid({
  dias,
  hoje,
  blocos,
  semana,
  onSlotClick,
  onDrop,
  onBlocoClick,
  onBlocoDblClick,
}: Props) {
  const [now, setNow] = useState<number | null>(null);
  const [overDia, setOverDia] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow(d.getHours() + d.getMinutes() / 60);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // Faixa 8h–19h, esticada quando algum bloco fica fora dela
  const H0 = Math.min(8, ...blocos.map((b) => Math.floor(b.inicio)));
  const H1 = Math.max(19, ...blocos.map((b) => Math.ceil(b.fim)));
  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);

  const horaDoEvento = (e: MouseEvent | DragEvent, alturaMin = 1): number => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const bruta = H0 + (e.clientY - rect.top) / ROW;
    const snap = Math.floor(bruta * 2) / 2; // encaixa em meias horas
    return Math.max(H0, Math.min(snap, H1 - alturaMin));
  };

  const soltar = (dataISO: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOverDia(null);
    if (!onDrop) return;
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const info = JSON.parse(raw) as DropInfo;
    onDrop(info, dataISO, horaDoEvento(e, info.durMin / 60));
  };

  const clicarVaga = (dataISO: string) => (e: MouseEvent<HTMLDivElement>) => {
    if (!onSlotClick) return;
    if ((e.target as HTMLElement).closest(".evt")) return;
    onSlotClick(dataISO, horaDoEvento(e));
  };

  const WD = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

  return (
    <>
      {semana && (
        <div className="weekhead stagger" style={{ ["--i" as string]: 0.5 }}>
          <div />
          {dias.map((d, i) => (
            <div key={d} className={`wd${d === hoje ? " today" : ""}`}>
              {WD[i]}
              <b>{Number(d.slice(8))}</b>
            </div>
          ))}
        </div>
      )}
      <div className={`timegrid${semana ? " week" : ""} stagger`} style={{ ["--i" as string]: 1 }}>
        {hours.map((h, i) => (
          <div key={h} className="hourlabel" style={{ gridRow: i + 1 }}>
            {h}:00
          </div>
        ))}
        {dias.map((dia) => (
          <div
            key={dia}
            className={`daycol${overDia === dia ? " dragover" : ""}`}
            style={{ gridRow: `1 / span ${H1 - H0}`, gridColumn: "auto" }}
            onClick={clicarVaga(dia)}
            onDragOver={onDrop ? (e) => { e.preventDefault(); setOverDia(dia); } : undefined}
            onDragLeave={onDrop ? () => setOverDia(null) : undefined}
            onDrop={onDrop ? soltar(dia) : undefined}
          >
            {hours.map((h) => (
              <div key={h} className="hourline" />
            ))}
            {blocos
              .filter((b) => b.dataISO === dia)
              .map((b) => (
                <div
                  key={`${b.tipo}-${b.id}`}
                  className={`evt ${b.classe}${b.feita ? " done" : ""}`}
                  style={{ top: (b.inicio - H0) * ROW, height: (b.fim - b.inicio) * ROW - 3 }}
                  role="button"
                  tabIndex={0}
                  draggable={!!onDrop}
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({ tipo: b.tipo, id: b.id, durMin: b.durMin } satisfies DropInfo),
                    )
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onBlocoClick?.(b);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onBlocoDblClick?.(b);
                  }}
                >
                  <span className="t">{b.titulo}</span>
                  <span className="h">
                    {hhmm(b.inicio)} – {hhmm(b.fim)}
                  </span>
                </div>
              ))}
            {dia === hoje && now !== null && now >= H0 && now <= H1 && (
              <div className="nowline" style={{ top: (now - H0) * ROW }} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
