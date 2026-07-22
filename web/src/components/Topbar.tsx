"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { somaDias } from "@/lib/db";
import type { ViewId } from "@/lib/demo";
import { entrarComGoogle } from "@/lib/gcal";
import { aplicarTema, proximoTema, ROTULO_TEMA, temaPref, type TemaPref } from "@/lib/tema";
import { LembreteCheck } from "@/components/Pwa";
import { VERSAO } from "@/lib/versao";

/** Header do redesign (10a). Nas visões de calendário: saudação em Lora +
 *  sequência 🔥, progresso do dia, navegação ‹ hoje › e o zoom temporal
 *  Dia/Semana/Mês/Ano. Nas demais (Tarefas, Notas, Grafo): título simples —
 *  a navegação primária vive no trilho/tab bar. No celular, um avatar
 *  redondo no canto direito abre o menu da conta (o trilho some lá). */

type Props = {
  view: ViewId;
  title: [string, string];
  /** dia sendo visto na visão Dia (pode não ser hoje) */
  diaAtual: string;
  hoje: string;
  /** primeiro nome (login Google) — sem login a saudação fica sozinha */
  nome: string | null;
  userEmail: string | null;
  weeklyDone: boolean;
  seq: number;
  placar: { done: number; total: number };
  onView: (v: ViewId) => void;
  onNavDia: (novoDia: string) => void;
  onNavSemana: (delta: -1 | 0 | 1) => void;
  onSync: () => void;
  onWeekly: () => void;
  onLogout: () => void;
  onToast: (msg: string) => void;
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

/** Avatar + menu da conta — só aparece no celular (o desktop tem o trilho).
 *  Com login: nome, revisão semanal, sync do Google, tema e sair.
 *  Sem login: entrar com Google (que já traz a agenda junto). */
function MenuConta(p: Pick<Props, "nome" | "userEmail" | "weeklyDone" | "onSync" | "onWeekly" | "onLogout" | "onToast">) {
  const [aberto, setAberto] = useState(false);
  const [tema, setTema] = useState<TemaPref>("sistema");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => setTema(temaPref()), []);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
    };
  }, [aberto]);

  const alternarTema = () => {
    const prox = proximoTema(tema);
    aplicarTema(prox);
    setTema(prox);
  };

  const inicial = (p.nome?.[0] ?? p.userEmail?.[0] ?? "K").toUpperCase();

  return (
    <>
      <button className="mob-avatar" onClick={() => setAberto((a) => !a)} aria-label="Conta" title={p.userEmail ?? "Conta"}>
        {inicial}
      </button>
      {aberto && (
        <div className="rail-menu mob-menu" ref={ref} role="menu">
          {p.userEmail ? (
            <div className="quem">
              {p.nome ? `${p.nome} · ` : ""}
              {p.userEmail}
            </div>
          ) : (
            <div className="quem">Você não está conectado</div>
          )}
          {p.userEmail ? (
            <>
              <button onClick={() => { setAberto(false); p.onWeekly(); }}>
                ⟳ Revisão semanal <span className="due-chip">{p.weeklyDone ? "✓" : "dom"}</span>
              </button>
              <button onClick={() => { setAberto(false); p.onSync(); }} title="Importa os eventos do Google Calendar (janela de 67 dias)">
                ⇄ Google Agenda
              </button>
            </>
          ) : (
            <button
              onClick={async () => {
                setAberto(false);
                const err = await entrarComGoogle();
                if (err) p.onToast(`Não foi possível entrar com Google: ${err}`);
              }}
            >
              G Entrar com Google
            </button>
          )}
          <button onClick={alternarTema}>◐ Tema: {ROTULO_TEMA[tema]}</button>
          <LembreteCheck />
          {p.userEmail && (
            <button onClick={() => { setAberto(false); p.onLogout(); }}>← Sair</button>
          )}
          <div className="versao">Kairós v{VERSAO} · em teste</div>
        </div>
      )}
    </>
  );
}

export default function Topbar({ view, title, diaAtual, hoje, nome, userEmail, weeklyDone, seq, placar, onView, onNavDia, onNavSemana, onSync, onWeekly, onLogout, onToast }: Props) {
  const calendario = view === "dia" || view === "semana" || view === "mes" || view === "ano";
  const conta = { nome, userEmail, weeklyDone, onSync, onWeekly, onLogout, onToast };

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
        <MenuConta {...conta} />
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
    // topbar-dia: no celular o zoom Dia/Semana/Mês/Ano some do Hoje — ele
    // pertence à aba Calendário (o seletor de 7 dias cuida da navegação)
    <header className={`topbar${view === "dia" ? " topbar-dia" : ""}`}>
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
      {/* no celular o avatar fica na 1ª linha, ao lado da saudação */}
      <MenuConta {...conta} />
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
