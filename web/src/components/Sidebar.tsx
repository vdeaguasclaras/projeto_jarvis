"use client";

import { AREAS, PROJECTS, RESOURCES } from "@/lib/demo";
import { LembreteCheck } from "@/components/Pwa";
import type { Container, Kind, Tarefa } from "@/lib/db";

type Props = {
  inboxCount: number;
  activeToday: boolean;
  activeTasks: boolean;
  userEmail: string | null;
  /** null → modo demonstração (mostra exemplos) */
  containers: Container[] | null;
  tarefas: Tarefa[];
  onToday: () => void;
  onTasks: () => void;
  onNotes: () => void;
  onSync: () => void;
  onInbox: () => void;
  onNew: (kind: Kind) => void;
  onOpenContainer: (id: string) => void;
  onWeekly: () => void;
  /** revisão da semana atual já registrada */
  weeklyDone: boolean;
  onLogout: () => void;
  onSoon: (what: string) => void;
};

const DOT = ["var(--today)", "var(--accent)", "var(--task)", "var(--google)"];

export default function Sidebar(p: Props) {
  const toggleTheme = () => {
    const root = document.documentElement;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const cur = root.dataset.theme || (dark ? "dark" : "light");
    root.dataset.theme = cur === "dark" ? "light" : "dark";
  };

  const abertas = (id: string) =>
    p.tarefas.filter((t) => t.container_id === id && t.status !== "concluida").length;

  const grupo = (kind: Kind, label: string, ico: string) => {
    const reais = p.containers?.filter((c) => c.kind === kind) ?? null;
    return (
      <>
        <div className="para-row">
          <span className="para-label">{label}</span>
          <button className="para-add" aria-label={`Criar ${label.toLowerCase()}`} onClick={() => p.onNew(kind)}>
            +
          </button>
        </div>
        {reais === null &&
          (kind === "projeto" ? PROJECTS.map((x) => x.name) : kind === "area" ? AREAS : RESOURCES).map((nome, i) => (
            <button key={nome} className="nav-item" onClick={() => p.onSoon(`Página de ${nome} (exemplo)`)}>
              {kind === "projeto" ? (
                <span className="proj-dot" style={{ background: DOT[i % DOT.length] }} />
              ) : (
                <span className="nav-ico">{ico}</span>
              )}
              {nome}
            </button>
          ))}
        {reais !== null && reais.length === 0 && <p className="side-empty">nenhum ainda — use o +</p>}
        {reais?.map((c, i) => (
          <button key={c.id} className="nav-item" onClick={() => p.onOpenContainer(c.id)}>
            {c.emoji ? (
              <span className="nav-ico">{c.emoji}</span>
            ) : kind === "projeto" ? (
              <span className="proj-dot" style={{ background: DOT[i % DOT.length] }} />
            ) : (
              <span className="nav-ico">{ico}</span>
            )}
            {c.nome}
            {kind === "projeto" && <span className="count">{abertas(c.id)}</span>}
          </button>
        ))}
      </>
    );
  };

  return (
    <nav className="sidebar" aria-label="Navegação PARA">
      <div className="brand">
        <div className="brand-mark">K</div>
        <div>
          <span className="brand-name">Kairós</span>
          <span className="brand-sub">o tempo certo · fase 1</span>
        </div>
      </div>

      <button className={`nav-item${p.activeToday ? " active" : ""}`} onClick={p.onToday}>
        <span className="nav-ico">◉</span> Hoje
      </button>
      <button className="nav-item" onClick={p.onInbox}>
        <span className="nav-ico">↓</span> Inbox <span className="count">{p.inboxCount}</span>
      </button>
      <button className={`nav-item${p.activeTasks ? " active" : ""}`} onClick={p.onTasks}>
        <span className="nav-ico">☑</span> Tarefas{" "}
        <span className="count">{p.tarefas.filter((t) => t.status !== "concluida").length || ""}</span>
      </button>
      <button className="nav-item" onClick={p.onNotes}>
        <span className="nav-ico">✎</span> Notas
      </button>
      <button className="nav-item" onClick={p.onWeekly}>
        <span className="nav-ico">⟳</span> Revisão semanal <span className="due-chip">{p.weeklyDone ? "✓" : "dom"}</span>
      </button>
      <button className="nav-item" onClick={p.onSync} title="Importa os eventos do Google Calendar (janela de 67 dias)">
        <span className="nav-ico">⇄</span> Google Agenda
      </button>

      {grupo("projeto", "Projetos", "▶")}
      {grupo("area", "Áreas", "▣")}
      {grupo("recurso", "Recursos", "◈")}

      <div className="para-row">
        <span className="para-label">&nbsp;</span>
      </div>
      <button className="nav-item" onClick={() => p.onSoon("Arquivo")}>
        <span className="nav-ico">▤</span> Arquivo
      </button>

      <div className="sidebar-foot">
        {p.userEmail && (
          <div className="whoami">
            <span title={p.userEmail}>{p.userEmail}</span>
            <button onClick={p.onLogout}>Sair</button>
          </div>
        )}
        <LembreteCheck />
        <button className="theme-toggle" onClick={toggleTheme}>
          ◐ Alternar tema
        </button>
      </div>
    </nav>
  );
}
