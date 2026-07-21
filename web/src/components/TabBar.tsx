"use client";

import { useState } from "react";
import { IconeAgenda, IconeEspacos, IconeHoje, IconeMais, IconeTarefas } from "@/components/Icones";
import type { RailAtivo } from "@/components/Rail";
import type { TipoCaptura } from "@/components/Captura";

/** Tab bar flutuante do celular (redesign 2a/16b):
 *  Hoje · Calendário · + central · Tarefas · Espaços.
 *  O + abre um leque com os três tipos de captura (tarefa/nota/evento). */

type Props = {
  ativo: RailAtivo;
  onHoje: () => void;
  onCalendario: () => void;
  onCapturar: (tipo: TipoCaptura) => void;
  onTarefas: () => void;
  onEspacos: () => void;
};

const LEQUE: { tipo: TipoCaptura; rotulo: string }[] = [
  { tipo: "evento", rotulo: "🗓 Evento" },
  { tipo: "nota", rotulo: "✎ Nota" },
  { tipo: "tarefa", rotulo: "☑ Tarefa" },
];

export default function TabBar(p: Props) {
  const [leque, setLeque] = useState(false);

  const item = (id: Exclude<RailAtivo, null>, rotulo: string, Icone: typeof IconeHoje, fn: () => void) => (
    <button className={`tabbar-item${p.ativo === id ? " active" : ""}`} onClick={fn}>
      <Icone tamanho={22} />
      {rotulo}
    </button>
  );

  return (
    <>
      {leque && <div className="leque-scrim" onClick={() => setLeque(false)} />}
      {leque && (
        <div className="leque" role="menu" aria-label="Capturar">
          {LEQUE.map((l) => (
            <button
              key={l.tipo}
              onClick={() => {
                setLeque(false);
                p.onCapturar(l.tipo);
              }}
            >
              {l.rotulo}
            </button>
          ))}
        </div>
      )}
      <nav className="tabbar" aria-label="Navegação">
        {item("hoje", "Hoje", IconeHoje, p.onHoje)}
        {item("agenda", "Calendário", IconeAgenda, p.onCalendario)}
        <button className={`tabbar-mais${leque ? " girado" : ""}`} onClick={() => setLeque((v) => !v)} aria-label="Capturar">
          <IconeMais />
        </button>
        {item("tarefas", "Tarefas", IconeTarefas, p.onTarefas)}
        {item("espacos", "Espaços", IconeEspacos, p.onEspacos)}
      </nav>
    </>
  );
}
