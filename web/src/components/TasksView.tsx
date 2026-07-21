"use client";

/** Tarefas do redesign (11b desktop · 6b mobile): kanban de altura fixa com
 *  rolagem interna por coluna (A fazer / Em andamento / Em espera / Concluídas
 *  hoje, com "Algum dia" recolhido), toggle Colunas/Lista, chips de filtro.
 *  Arrastar um card para outra coluna muda o status; no celular é sempre lista. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  hojeISO,
  somaDias,
  type Container,
  type Pessoa,
  type Prioridade,
  type Tarefa,
  type TarefaStatus,
} from "@/lib/db";
import { normalizar } from "@/lib/parser";

type Props = {
  tarefas: Tarefa[];
  containers: Container[];
  pessoas: Pessoa[];
  /** prioridades do dia (★ nos cards) */
  prioDia: Prioridade[];
  logged: boolean;
  onConclude: (id: string) => void;
  onStatus: (id: string, status: TarefaStatus) => void;
  onEdit: (t: Tarefa) => void;
  onToast: (msg: string) => void;
};

const COLUNAS: [TarefaStatus, string][] = [
  ["a_fazer", "A fazer"],
  ["em_andamento", "Em andamento"],
  ["em_espera", "Em espera"],
  ["concluida", "Concluídas hoje"],
];

const GRUPOS_LISTA: [TarefaStatus, string][] = [
  ["a_fazer", "A fazer"],
  ["em_andamento", "Em andamento"],
  ["em_espera", "Em espera"],
  ["algum_dia", "Algum dia"],
  ["concluida", "Concluídas hoje"],
];

type FiltroPrazo = "todas" | "hoje" | "semana" | "vencidas" | "sem";
const FILTROS_PRAZO: [FiltroPrazo, string][] = [
  ["todas", "todas"],
  ["hoje", "hoje"],
  ["semana", "esta semana"],
  ["vencidas", "vencidas"],
  ["sem", "sem prazo"],
];
const LABEL_PRAZO: Record<FiltroPrazo, string> = {
  todas: "",
  hoje: "Hoje",
  semana: "Esta semana",
  vencidas: "Vencidas",
  sem: "Sem prazo",
};

const REC_LABEL = { diaria: "diária", semanal: "semanal", quinzenal: "quinzenal", mensal: "mensal" } as const;

function prazoChip(prazo: string | null, hoje: string): { txt: string; tom: "hoje" | "venceu" | "neutro" } | null {
  if (!prazo) return null;
  if (prazo < hoje) return { txt: `venceu ${prazo.split("-").reverse().slice(0, 2).join("/")}`, tom: "venceu" };
  if (prazo === hoje) return { txt: "hoje", tom: "hoje" };
  if (prazo === somaDias(hoje, 1)) return { txt: "amanhã", tom: "neutro" };
  return { txt: prazo.split("-").reverse().slice(0, 2).join("/"), tom: "neutro" };
}

/** Chips do card/linha: grupo, prazo, @pessoa (espera = "@x · cobrar"), ⟳ */
function ChipsDe({ t, cont, quem, hoje }: { t: Tarefa; cont: Container | null; quem: Pessoa | null; hoje: string }) {
  const pc = t.status === "concluida" ? null : prazoChip(t.prazo, hoje);
  const espera = t.status === "em_espera";
  if (t.status === "concluida") return null;
  return (
    <div className="kchips">
      {cont && (
        <span className={`tchip${cont.kind === "projeto" ? " proj" : ""}`}>
          {cont.kind === "projeto" ? "▶ " : cont.kind === "area" ? "/" : "◆ "}
          {cont.emoji ? `${cont.emoji} ` : ""}
          {cont.nome}
        </span>
      )}
      {espera && quem ? (
        <span className="tchip hoje">
          @{quem.nome}
          {pc ? ` · cobrar ${pc.txt.replace("venceu ", "")}` : ""}
        </span>
      ) : (
        <>
          {pc && <span className={`tchip${pc.tom === "hoje" ? " hoje" : pc.tom === "venceu" ? " venceu" : ""}`}>{pc.txt}</span>}
          {quem && <span className="tchip hoje">@{quem.nome}</span>}
        </>
      )}
      {t.recorrencia && <span className="tchip">⟳ {REC_LABEL[t.recorrencia]}</span>}
    </div>
  );
}

/** Coluna do kanban: rola por dentro; no limite, fade com "+ N ↓". */
function Coluna({
  status,
  label,
  itens,
  extra,
  onDropStatus,
  children,
}: {
  status: TarefaStatus;
  label: string;
  itens: number;
  extra?: React.ReactNode;
  onDropStatus: (id: string, status: TarefaStatus) => void;
  children: React.ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [abaixo, setAbaixo] = useState(0);
  const [alvo, setAlvo] = useState(false);

  const medir = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const limite = el.scrollTop + el.clientHeight;
    let n = 0;
    for (const filho of Array.from(el.children) as HTMLElement[]) {
      if (filho.offsetTop + 12 > limite) n++;
    }
    setAbaixo(n);
  }, []);

  useEffect(() => {
    medir();
    const el = bodyRef.current;
    el?.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      el?.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, [medir, children]);

  return (
    <div
      className={`kcol${alvo ? " alvo" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/json")) {
          e.preventDefault();
          setAlvo(true);
        }
      }}
      onDragLeave={() => setAlvo(false)}
      onDrop={(e) => {
        setAlvo(false);
        try {
          const info = JSON.parse(e.dataTransfer.getData("application/json"));
          if (info?.tipo === "tarefa" && info.id) {
            e.preventDefault();
            onDropStatus(info.id, status);
          }
        } catch {
          /* payload de outro arrasto — ignora */
        }
      }}
    >
      <div className="kcol-head">
        <span className="klbl">{label}</span>
        <span className="kn">{itens}</span>
      </div>
      <div className="kcol-body" ref={bodyRef}>
        {children}
      </div>
      {extra}
      {abaixo > 0 && <div className="kmais">+ {abaixo} ↓</div>}
    </div>
  );
}

export default function TasksView({ tarefas, containers, pessoas, prioDia, logged, onConclude, onStatus, onEdit, onToast }: Props) {
  const [busca, setBusca] = useState("");
  const [fPrazo, setFPrazo] = useState<FiltroPrazo>("todas");
  const [fContainer, setFContainer] = useState<string>("todos");
  const [fPessoa, setFPessoa] = useState<string>("todas");
  const [popAberto, setPopAberto] = useState(false);
  const [algumAberto, setAlgumAberto] = useState(false);
  const [modo, setModo] = useState<"colunas" | "lista">("colunas");
  const [mobile, setMobile] = useState(false);

  // Modo lembrado; no celular (6b) é sempre lista
  useEffect(() => {
    const salvo = window.localStorage.getItem("kairos.tarefas.modo");
    if (salvo === "lista" || salvo === "colunas") setModo(salvo);
    const mq = window.matchMedia("(max-width: 900px)");
    const aplicar = () => setMobile(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);
  const trocarModo = (m: "colunas" | "lista") => {
    setModo(m);
    window.localStorage.setItem("kairos.tarefas.modo", m);
  };

  const containerDe = useCallback((id: string | null) => containers.find((c) => c.id === id) ?? null, [containers]);
  const pessoaDe = useCallback((id: string | null) => pessoas.find((p) => p.id === id) ?? null, [pessoas]);
  const hoje = hojeISO();
  const fimSemana = somaDias(hoje, 6 - ((new Date().getDay() + 6) % 7)); // domingo desta semana
  const priorizadaIds = useMemo(() => new Set(prioDia.map((p) => p.tarefa_id).filter(Boolean) as string[]), [prioDia]);

  const passaFiltros = useCallback(
    (t: Tarefa): boolean => {
      if (busca && !normalizar(t.titulo).includes(normalizar(busca))) return false;
      if (fContainer !== "todos" && t.container_id !== (fContainer === "nenhum" ? null : fContainer)) return false;
      if (fPessoa !== "todas" && t.responsavel_id !== fPessoa) return false;
      if (fPrazo === "hoje" && t.prazo !== hoje) return false;
      if (fPrazo === "semana" && (t.prazo === null || t.prazo < hoje || t.prazo > fimSemana)) return false;
      if (fPrazo === "vencidas" && (t.prazo === null || t.prazo >= hoje)) return false;
      if (fPrazo === "sem" && t.prazo !== null) return false;
      return true;
    },
    [busca, fContainer, fPessoa, fPrazo, hoje, fimSemana],
  );

  const itensDe = useCallback(
    (status: TarefaStatus) =>
      tarefas
        .filter((t) =>
          status === "concluida"
            ? t.status === "concluida" && (t.concluida_em ?? "").slice(0, 10) === hoje
            : t.status === status,
        )
        .filter(passaFiltros),
    [tarefas, passaFiltros, hoje],
  );

  const abertas = tarefas.filter((t) => t.status !== "concluida").filter(passaFiltros).length;
  const filtrando = busca !== "" || fPrazo !== "todas" || fContainer !== "todos" || fPessoa !== "todas";
  const limpar = () => {
    setBusca("");
    setFPrazo("todas");
    setFContainer("todos");
    setFPessoa("todas");
    setPopAberto(false);
  };

  const moverPara = useCallback(
    (id: string, destino: TarefaStatus) => {
      const t = tarefas.find((x) => x.id === id);
      if (!t) return;
      const origem: TarefaStatus = t.status === "concluida" && (t.concluida_em ?? "").slice(0, 10) === hoje ? "concluida" : t.status;
      if (origem === destino) return;
      if (destino === "concluida") onConclude(id);
      else onStatus(id, destino);
    },
    [tarefas, hoje, onConclude, onStatus],
  );

  if (!logged) {
    return (
      <div className="view-in">
        <div className="soon">
          <h2>Tarefas</h2>
          <p>Entre para ver suas tarefas reais — elas nascem da captura e do Despacho.</p>
          <span className="chip">capturar → organizar → fazer</span>
        </div>
      </div>
    );
  }

  const contFiltro = fContainer !== "todos" && fContainer !== "nenhum" ? containerDe(fContainer) : null;
  const pesFiltro = fPessoa !== "todas" ? pessoaDe(fPessoa) : null;
  const emLista = mobile || modo === "lista";

  const cardDe = (t: Tarefa, feita: boolean) => (
    <button
      key={t.id}
      className={`kcard${t.status === "em_espera" ? " espera" : ""}${feita ? " feita" : ""}`}
      draggable
      onDragStart={(e) =>
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ tipo: "tarefa", id: t.id, durMin: t.duracao_min ?? 30 }),
        )
      }
      onClick={() => onEdit(t)}
      title="Abrir a tarefa"
    >
      <div className="kt">
        {t.titulo}
        {priorizadaIds.has(t.id) && !feita && <span className="tstar">★</span>}
      </div>
      <ChipsDe t={t} cont={containerDe(t.container_id)} quem={pessoaDe(t.responsavel_id)} hoje={hoje} />
    </button>
  );

  const filtros = (
    <div className="tv-filtros stagger" style={{ ["--i" as string]: 0 }}>
      <button className={`fchip${!filtrando ? " on" : ""}`} onClick={limpar}>
        Todas · {abertas}
      </button>
      <button
        className={`fchip${fPrazo === "hoje" ? " on" : ""}`}
        onClick={() => setFPrazo(fPrazo === "hoje" ? "todas" : "hoje")}
      >
        Hoje
      </button>
      {fPrazo !== "todas" && fPrazo !== "hoje" && (
        <button className="fchip on" onClick={() => setFPrazo("todas")}>
          {LABEL_PRAZO[fPrazo]} <span className="x">×</span>
        </button>
      )}
      {fContainer !== "todos" && (
        <button className="fchip on" onClick={() => setFContainer("todos")}>
          {fContainer === "nenhum"
            ? "sem grupo"
            : `${contFiltro?.kind === "projeto" ? "▶ " : "/"}${contFiltro?.nome ?? ""}`}{" "}
          <span className="x">×</span>
        </button>
      )}
      {pesFiltro && (
        <button className="fchip on" onClick={() => setFPessoa("todas")}>
          @{pesFiltro.nome} <span className="x">×</span>
        </button>
      )}
      {busca && (
        <button className="fchip on" onClick={() => setBusca("")}>
          ⌕ {busca} <span className="x">×</span>
        </button>
      )}
      <button className={`fchip${popAberto ? " on" : ""}`} onClick={() => setPopAberto((a) => !a)}>
        + filtro
      </button>
      {!mobile && (
        <div className="seg" role="tablist" aria-label="Modo de exibição">
          <button role="tab" className={modo === "colunas" ? "on" : ""} onClick={() => trocarModo("colunas")}>
            Colunas
          </button>
          <button role="tab" className={modo === "lista" ? "on" : ""} onClick={() => trocarModo("lista")}>
            Lista
          </button>
        </div>
      )}
      {popAberto && (
        <div className="tv-pop">
          <input
            className="note-search"
            placeholder="Filtrar por texto…"
            value={busca}
            autoFocus
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setPopAberto(false)}
          />
          <select className="note-search" value={fContainer} onChange={(e) => setFContainer(e.target.value)}>
            <option value="todos">todos os grupos</option>
            <option value="nenhum">sem grupo</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.nome}
              </option>
            ))}
          </select>
          <select className="note-search" value={fPessoa} onChange={(e) => setFPessoa(e.target.value)}>
            <option value="todas">qualquer responsável</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                @{p.nome}
              </option>
            ))}
          </select>
          <div className="pillrow" style={{ margin: 0 }}>
            {FILTROS_PRAZO.map(([f, label]) => (
              <button key={f} className={`pill-opt${fPrazo === f ? " on" : ""}`} onClick={() => setFPrazo(f)}>
                {label}
              </button>
            ))}
          </div>
          <button className="fchip" onClick={() => setPopAberto(false)}>
            Fechar
          </button>
        </div>
      )}
    </div>
  );

  // ── Modo Colunas (11b) ──
  if (!emLista) {
    const algumDia = itensDe("algum_dia");
    return (
      <div className="view-in">
        {filtros}
        <div className="kanban stagger" style={{ ["--i" as string]: 1 }}>
          {COLUNAS.map(([status, label]) => {
            const itens = itensDe(status);
            const ultima = status === "concluida";
            return (
              <Coluna
                key={status}
                status={status}
                label={label}
                itens={itens.length}
                onDropStatus={moverPara}
                extra={
                  ultima ? (
                    <button className="kalgum" onClick={() => setAlgumAberto((a) => !a)}>
                      Algum dia · {algumDia.length} {algumDia.length === 1 ? "item" : "itens"} —{" "}
                      {algumAberto ? "recolher ▴" : "recolhido ▸"}
                    </button>
                  ) : undefined
                }
              >
                {itens.length === 0 && !(ultima && algumAberto) && (
                  <p className="empty-hint" style={{ margin: "2px 4px" }}>
                    {status === "a_fazer" && !filtrando ? "Nada aqui — capture algo ou despache a Inbox." : "Vazio."}
                  </p>
                )}
                {itens.map((t) => cardDe(t, ultima))}
                {ultima && algumAberto && algumDia.map((t) => cardDe(t, false))}
              </Coluna>
            );
          })}
        </div>
        <p className="empty-hint" style={{ marginTop: 8 }}>
          Arraste um card para outra coluna para mudar o status — soltar em “Concluídas hoje” conclui.
        </p>
      </div>
    );
  }

  // ── Modo Lista (6b · celular e toggle) ──
  return (
    <div className="view-in tv-lista">
      {filtros}
      {GRUPOS_LISTA.map(([status, label]) => {
        const itens = itensDe(status);
        if (!itens.length && (filtrando || status === "em_andamento" || status === "algum_dia")) return null;
        return (
          <div key={status}>
            <h3>
              {label} · {itens.length}
            </h3>
            {itens.length === 0 && (
              <p className="empty-hint">
                {status === "a_fazer"
                  ? "Nada aqui — capture algo ou despache a Inbox."
                  : status === "concluida"
                    ? "Nenhuma concluída hoje ainda."
                    : "Vazio."}
              </p>
            )}
            {itens.map((t) => {
              const feita = t.status === "concluida";
              return (
                <div key={t.id} className={`tl-item${t.status === "em_espera" ? " espera" : ""}${feita ? " feita" : ""}`}>
                  <button
                    className={`tl-box${feita ? " on" : ""}`}
                    role="checkbox"
                    aria-checked={feita}
                    onClick={() => (feita ? onToast("Já concluída ✓") : onConclude(t.id))}
                  >
                    ✓
                  </button>
                  <button className="tl-txt" onClick={() => onEdit(t)} title="Abrir a tarefa">
                    {t.titulo}
                    {priorizadaIds.has(t.id) && !feita && <span className="tstar"> ★</span>}
                    <ChipsDe t={t} cont={containerDe(t.container_id)} quem={pessoaDe(t.responsavel_id)} hoje={hoje} />
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
