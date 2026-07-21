"use client";

import { useEffect, useRef, useState } from "react";
import { IconeAgenda, IconeEspacos, IconeHoje, IconeMais, IconeTarefas } from "@/components/Icones";
import { LembreteCheck } from "@/components/Pwa";
import { aplicarTema, proximoTema, ROTULO_TEMA, temaPref, type TemaPref } from "@/lib/tema";

/** Trilho esquerdo de 76px (redesign 10a): K, Hoje, Agenda, + central,
 *  Tarefas, Espaços; embaixo ◐ tema e o avatar (menu da conta). */

export type RailAtivo = "hoje" | "agenda" | "tarefas" | "espacos" | null;

type Props = {
  ativo: RailAtivo;
  userEmail: string | null;
  weeklyDone: boolean;
  onHoje: () => void;
  onAgenda: () => void;
  onCapturar: () => void;
  onTarefas: () => void;
  onEspacos: () => void;
  onSync: () => void;
  onWeekly: () => void;
  onLogout: () => void;
};

export default function Rail(p: Props) {
  const [tema, setTema] = useState<TemaPref>("sistema");
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setTema(temaPref()), []);

  // clique fora fecha o menu do avatar
  useEffect(() => {
    if (!menu) return;
    const fora = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [menu]);

  const alternarTema = () => {
    const prox = proximoTema(tema);
    aplicarTema(prox);
    setTema(prox);
  };

  const inicial = (p.userEmail?.[0] ?? "K").toUpperCase();

  const item = (id: Exclude<RailAtivo, null>, rotulo: string, Icone: typeof IconeHoje, fn: () => void) => (
    <button className={`rail-item${p.ativo === id ? " active" : ""}`} onClick={fn} aria-label={rotulo}>
      <Icone />
      <small>{rotulo}</small>
    </button>
  );

  return (
    <nav className="rail" aria-label="Navegação">
      <div className="rail-k">K</div>
      {item("hoje", "Hoje", IconeHoje, p.onHoje)}
      {item("agenda", "Agenda", IconeAgenda, p.onAgenda)}
      <button className="rail-mais" onClick={p.onCapturar} aria-label="Capturar (atalho: c)" title="Capturar (atalho: c)">
        <IconeMais />
      </button>
      {item("tarefas", "Tarefas", IconeTarefas, p.onTarefas)}
      {item("espacos", "Espaços", IconeEspacos, p.onEspacos)}
      <div className="rail-foot">
        <button className="rail-tema" onClick={alternarTema} title={`Tema: ${ROTULO_TEMA[tema]} (alternar)`} aria-label="Alternar tema">
          ◐
        </button>
        <button className="rail-avatar" onClick={() => setMenu((m) => !m)} aria-label="Conta" title={p.userEmail ?? "Conta"}>
          {inicial}
        </button>
      </div>
      {menu && (
        <div className="rail-menu" ref={menuRef} role="menu">
          {p.userEmail && <div className="quem">{p.userEmail}</div>}
          <button onClick={() => { setMenu(false); p.onWeekly(); }}>
            ⟳ Revisão semanal <span className="due-chip">{p.weeklyDone ? "✓" : "dom"}</span>
          </button>
          <button onClick={() => { setMenu(false); p.onSync(); }} title="Importa os eventos do Google Calendar (janela de 67 dias)">
            ⇄ Google Agenda
          </button>
          <button onClick={alternarTema}>◐ Tema: {ROTULO_TEMA[tema]}</button>
          <LembreteCheck />
          {p.userEmail && (
            <button onClick={() => { setMenu(false); p.onLogout(); }}>← Sair</button>
          )}
        </div>
      )}
    </nav>
  );
}
