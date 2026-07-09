"use client";

import { AREAS, PROJECTS, RESOURCES } from "@/lib/demo";

type Props = {
  inboxCount: number;
  activeToday: boolean;
  onToday: () => void;
  onSoon: (what: string) => void;
};

export default function Sidebar({ inboxCount, activeToday, onToday, onSoon }: Props) {
  const toggleTheme = () => {
    const root = document.documentElement;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const cur = root.dataset.theme || (dark ? "dark" : "light");
    root.dataset.theme = cur === "dark" ? "light" : "dark";
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

      <button className={`nav-item${activeToday ? " active" : ""}`} onClick={onToday}>
        <span className="nav-ico">◉</span> Hoje <span className="count">6</span>
      </button>
      <button className="nav-item" onClick={() => onSoon("Inbox com triagem GTD")}>
        <span className="nav-ico">↓</span> Inbox <span className="count">{inboxCount}</span>
      </button>
      <button className="nav-item" onClick={() => onSoon("Notas (Zettelkasten)")}>
        <span className="nav-ico">✎</span> Notas <span className="count">0</span>
      </button>
      <button className="nav-item" onClick={() => onSoon("Revisão semanal")}>
        <span className="nav-ico">⟳</span> Revisão semanal <span className="due-chip">dom</span>
      </button>

      <div className="para-row">
        <span className="para-label">Projetos</span>
        <button className="para-add" aria-label="Novo projeto" onClick={() => onSoon("Criar projeto")}>
          +
        </button>
      </div>
      {PROJECTS.map((p) => (
        <button key={p.id} className="nav-item" onClick={() => onSoon(`Página do projeto ${p.name}`)}>
          <span className="proj-dot" style={{ background: p.color }} /> {p.name}
          <span className="count">{p.count}</span>
        </button>
      ))}

      <div className="para-row">
        <span className="para-label">Áreas</span>
        <button className="para-add" aria-label="Nova área" onClick={() => onSoon("Criar área")}>
          +
        </button>
      </div>
      {AREAS.map((a) => (
        <button key={a} className="nav-item" onClick={() => onSoon(`Página da área ${a}`)}>
          <span className="nav-ico">▣</span> {a}
        </button>
      ))}

      <div className="para-row">
        <span className="para-label">Recursos</span>
        <button className="para-add" aria-label="Novo recurso" onClick={() => onSoon("Criar recurso")}>
          +
        </button>
      </div>
      {RESOURCES.map((r) => (
        <button key={r} className="nav-item" onClick={() => onSoon(`Recurso ${r}`)}>
          <span className="nav-ico">◈</span> {r}
        </button>
      ))}

      <div className="para-row">
        <span className="para-label">&nbsp;</span>
      </div>
      <button className="nav-item" onClick={() => onSoon("Arquivo")}>
        <span className="nav-ico">▤</span> Arquivo
      </button>

      <div className="sidebar-foot">
        <button className="theme-toggle" onClick={toggleTheme}>
          ◐ Alternar tema
        </button>
      </div>
    </nav>
  );
}
