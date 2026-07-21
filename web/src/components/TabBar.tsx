"use client";

import { IconeAgenda, IconeEspacos, IconeHoje, IconeMais, IconeTarefas } from "@/components/Icones";
import type { RailAtivo } from "@/components/Rail";

/** Tab bar flutuante do celular (redesign 2a/16b):
 *  Hoje · Calendário · + central · Tarefas · Espaços. */

type Props = {
  ativo: RailAtivo;
  onHoje: () => void;
  onCalendario: () => void;
  onCapturar: () => void;
  onTarefas: () => void;
  onEspacos: () => void;
};

export default function TabBar(p: Props) {
  const item = (id: Exclude<RailAtivo, null>, rotulo: string, Icone: typeof IconeHoje, fn: () => void) => (
    <button className={`tabbar-item${p.ativo === id ? " active" : ""}`} onClick={fn}>
      <Icone tamanho={22} />
      {rotulo}
    </button>
  );

  return (
    <nav className="tabbar" aria-label="Navegação">
      {item("hoje", "Hoje", IconeHoje, p.onHoje)}
      {item("agenda", "Calendário", IconeAgenda, p.onCalendario)}
      <button className="tabbar-mais" onClick={p.onCapturar} aria-label="Capturar">
        <IconeMais />
      </button>
      {item("tarefas", "Tarefas", IconeTarefas, p.onTarefas)}
      {item("espacos", "Espaços", IconeEspacos, p.onEspacos)}
    </nav>
  );
}
