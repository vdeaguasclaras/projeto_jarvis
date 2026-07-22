"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Container, Nota, Pessoa, ProjetoArea, Tarefa } from "@/lib/db";
import { linksDe, pessoasDe } from "@/lib/markdown";
import { normalizar } from "@/lib/parser";

/** Etapa H do redesign (12c · 8b) — Grafo de conexões:
 *  nós = notas, projetos/áreas/recursos e @pessoas; arestas = [[links]],
 *  agrupamentos e menções. Clique seleciona (card com "Abrir" e "Só vizinhos");
 *  arraste reorganiza. Filtros por tipo (pills coloridas), arquivados,
 *  foco por busca com profundidade em saltos e zoom +/−/⌖. */

type Tipo = "nota" | "projeto" | "area" | "recurso" | "pessoa";
type NoDado = { chave: string; label: string; nome: string; tipo: Tipo; arq: boolean };
type No = NoDado & { x: number; y: number; vx: number; vy: number };

type Props = {
  logged: boolean;
  notas: Nota[];
  containers: Container[];
  arquivados: Container[];
  projetoAreas: ProjetoArea[];
  pessoas: Pessoa[];
  tarefas: Tarefa[];
  onAbrirNota: (id: string) => void;
  onAbrirContainer: (id: string) => void;
  onAbrirPessoas: () => void;
  onVoltar: () => void;
};

// Cores por tipo, dos tokens (12c): nota lilás, projeto terracota, área verde,
// pessoa terracota-escura, recurso apagado.
const COR: Record<Tipo, string> = {
  nota: "--purple",
  projeto: "--terracotta",
  area: "--green",
  recurso: "--ink-muted",
  pessoa: "--terracotta-deep",
};

const TIPO_LABEL: [Tipo, string][] = [
  ["nota", "Notas"],
  ["projeto", "Projetos"],
  ["area", "Áreas"],
  ["recurso", "Recursos"],
  ["pessoa", "Pessoas"],
];

const TIPO_NOME: Record<Tipo, string> = {
  nota: "nota",
  projeto: "projeto",
  area: "área",
  recurso: "recurso",
  pessoa: "pessoa",
};

export default function GraphView({
  logged,
  notas,
  containers,
  arquivados,
  projetoAreas,
  pessoas,
  tarefas,
  onAbrirNota,
  onAbrirContainer,
  onAbrirPessoas,
  onVoltar,
}: Props) {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  // posições sobrevivem a mudanças de filtro/seleção — o grafo não embaralha
  const posRef = useRef(new Map<string, { x: number; y: number }>());
  const [tipos, setTipos] = useState<Record<Tipo, boolean>>({
    nota: true,
    projeto: true,
    area: true,
    recurso: true,
    pessoa: true,
  });
  const [comArquivados, setComArquivados] = useState(true);
  const [foco, setFoco] = useState<string>(""); // chave do nó em foco
  const [saltos, setSaltos] = useState(2); // profundidade da vizinhança do foco
  const [sel, setSel] = useState<string>(""); // chave do nó selecionado (card)
  const [zoom, setZoom] = useState(1);
  const [busca, setBusca] = useState("");

  const todosContainers = useMemo(
    () => [
      ...containers.map((c) => ({ c, arq: false })),
      ...arquivados.map((c) => ({ c, arq: true })),
    ],
    [containers, arquivados],
  );

  // ── o grafo como dado (nós + arestas por chave), fora do canvas:
  //    alimenta a simulação, o card do nó e a busca de foco ──
  const grafo = useMemo(() => {
    const nos: NoDado[] = [];
    const porChave = new Map<string, NoDado>();
    const addNo = (chave: string, nome: string, tipo: Tipo, arq = false, prefixo = "") => {
      let n = porChave.get(chave);
      if (!n) {
        const label = prefixo + nome;
        n = { chave, label: label.length > 26 ? label.slice(0, 24) + "…" : label, nome, tipo, arq };
        porChave.set(chave, n);
        nos.push(n);
      }
      return n;
    };
    const arestas: [string, string][] = [];
    const liga = (a: string, b: string) => {
      if (a !== b && !arestas.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) arestas.push([a, b]);
    };

    for (const { c, arq } of todosContainers)
      addNo(`c:${c.id}`, c.nome, c.kind as Tipo, arq, `${arq ? "▤ " : ""}${c.emoji ? c.emoji + " " : ""}`);
    // projeto pode pertencer a várias áreas → arestas estruturais do PARA
    for (const l of projetoAreas) {
      if (porChave.has(`c:${l.projeto_id}`) && porChave.has(`c:${l.area_id}`)) liga(`c:${l.projeto_id}`, `c:${l.area_id}`);
    }
    for (const n of notas) addNo(`nota:${n.id}`, n.titulo, "nota");
    for (const n of notas) {
      const eu = `nota:${n.id}`;
      if (n.container_id && porChave.has(`c:${n.container_id}`)) liga(eu, `c:${n.container_id}`);
      for (const t of linksDe(n.md)) {
        const alvoNota = notas.find((x) => normalizar(x.titulo) === normalizar(t));
        if (alvoNota) {
          liga(eu, `nota:${alvoNota.id}`);
          continue;
        }
        const alvoC = todosContainers.find(({ c }) => normalizar(c.nome) === normalizar(t));
        if (alvoC) liga(eu, `c:${alvoC.c.id}`);
      }
      for (const p of pessoasDe(n.md)) {
        const pe = pessoas.find((x) => normalizar(x.nome) === normalizar(p));
        liga(eu, addNo(`p:${pe?.id ?? p}`, pe?.nome ?? p, "pessoa", false, "@").chave);
      }
    }
    return { nos, porChave, arestas };
  }, [notas, todosContainers, projetoAreas, pessoas]);

  // vizinhança do foco por BFS até "saltos" — o slider do 12c
  const visiveis = useMemo(() => {
    const { nos, porChave, arestas } = grafo;
    let conjunto = new Set(nos.map((n) => n.chave));
    const focoNo = foco ? porChave.get(foco) ?? null : null;
    if (focoNo) {
      const dist = new Map<string, number>([[foco, 0]]);
      let borda = [foco];
      for (let d = 1; d <= saltos && borda.length; d++) {
        const prox: string[] = [];
        for (const [a, b] of arestas) {
          if (dist.has(a) && dist.get(a)! === d - 1 && !dist.has(b)) {
            dist.set(b, d);
            prox.push(b);
          }
          if (dist.has(b) && dist.get(b)! === d - 1 && !dist.has(a)) {
            dist.set(a, d);
            prox.push(a);
          }
        }
        borda = prox;
      }
      conjunto = new Set(dist.keys());
    }
    for (const chave of [...conjunto]) {
      if (chave === foco) continue; // o foco fica sempre visível
      const n = grafo.porChave.get(chave)!;
      if (!tipos[n.tipo] || (n.arq && !comArquivados)) conjunto.delete(chave);
    }
    return conjunto;
  }, [grafo, foco, saltos, tipos, comArquivados]);

  const grau = useCallback(
    (chave: string) => grafo.arestas.filter(([a, b]) => a === chave || b === chave).length,
    [grafo],
  );

  const selNo = sel ? grafo.porChave.get(sel) ?? null : null;
  const focoNo = foco ? grafo.porChave.get(foco) ?? null : null;
  const selRef = useRef<string>("");
  selRef.current = sel;
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  // ── simulação e desenho no canvas (a física de sempre + zoom e halos) ──
  useEffect(() => {
    if (!logged) return;
    const cv = cvRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;

    const nos: No[] = grafo.nos
      .filter((n) => visiveis.has(n.chave))
      .map((n, i) => {
        const pos =
          posRef.current.get(n.chave) ?? {
            x: 0.5 + 0.36 * Math.cos((i / 9) * Math.PI * 2 + i * 0.7),
            y: 0.5 + 0.36 * Math.sin((i / 9) * Math.PI * 2 + i * 0.7),
          };
        posRef.current.set(n.chave, pos);
        return { ...n, x: pos.x, y: pos.y, vx: 0, vy: 0 };
      });
    const porChave = new Map(nos.map((n) => [n.chave, n]));
    const arestas = grafo.arestas
      .filter(([a, b]) => porChave.has(a) && porChave.has(b))
      .map(([a, b]) => [porChave.get(a)!, porChave.get(b)!] as [No, No]);

    const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let raf: number | null = null;
    let dragging: No | null = null;
    let hover: No | null = null;
    let downAt: { x: number; y: number } | null = null;

    // zoom em torno do centro: tela = (p − ½)·z + ½
    const tela = (v: number) => (v - 0.5) * zoomRef.current + 0.5;
    const mundo = (v: number) => (v - 0.5) / zoomRef.current + 0.5;

    const cores = () => {
      const cs = getComputedStyle(document.documentElement);
      const de = (v: string) => cs.getPropertyValue(v).trim();
      return {
        tipo: (t: Tipo) => de(COR[t]),
        line: de("--border"),
        ink: de("--ink-secondary"),
      };
    };
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = devicePixelRatio || 1;
      W = r.width;
      H = r.height;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const tick = () => {
      for (const n of nos) {
        if (n === dragging) continue;
        let fx = (0.5 - n.x) * 0.0012;
        let fy = (0.5 - n.y) * 0.0012;
        for (const m of nos) {
          if (m === n) continue;
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const d2 = dx * dx + dy * dy + 0.0005;
          fx += (dx / d2) * 0.000045;
          fy += (dy / d2) * 0.000045;
        }
        n.vx = (n.vx + fx) * 0.86;
        n.vy = (n.vy + fy) * 0.86;
      }
      for (const [a, b] of arestas) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const f = (d - 0.2) * 0.004;
        if (a !== dragging) {
          a.vx += (dx / d) * f;
          a.vy += (dy / d) * f;
        }
        if (b !== dragging) {
          b.vx -= (dx / d) * f;
          b.vy -= (dy / d) * f;
        }
      }
      for (const n of nos) {
        if (n === dragging) continue;
        n.x = Math.min(0.96, Math.max(0.04, n.x + n.vx));
        n.y = Math.min(0.94, Math.max(0.06, n.y + n.vy));
        posRef.current.set(n.chave, { x: n.x, y: n.y });
      }
    };
    const raio = (n: No) => {
      const base = n.tipo === "projeto" || n.tipo === "area" ? 10 : n.tipo === "nota" ? 7.5 : 6.5;
      return n.chave === foco ? base * 1.7 : base;
    };
    const draw = () => {
      const C = cores();
      const z = zoomRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1.2;
      for (const [a, b] of arestas) {
        // aresta que encosta num arquivado fica apagada como ele
        ctx.globalAlpha = a.arq || b.arq ? 0.4 : 1;
        ctx.strokeStyle = C.line;
        ctx.beginPath();
        ctx.moveTo(tela(a.x) * W, tela(a.y) * H);
        ctx.lineTo(tela(b.x) * W, tela(b.y) * H);
        ctx.stroke();
      }
      for (const n of nos) {
        // arquivado = mais apagado (o A do PARA continua na rede, sem gritar)
        ctx.globalAlpha = n.arq ? 0.38 : 1;
        const x = tela(n.x) * W;
        const y = tela(n.y) * H;
        const r = (raio(n) + (n === hover ? 2.5 : 0)) * Math.sqrt(z);
        const cor = C.tipo(n.tipo);
        // halo do foco e do selecionado, como no canvas 12c
        if (n.chave === foco || n.chave === selRef.current) {
          ctx.beginPath();
          ctx.arc(x, y, r + 8, 0, Math.PI * 2);
          ctx.strokeStyle = cor;
          ctx.globalAlpha = (n.arq ? 0.38 : 1) * 0.3;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = n.arq ? 0.38 : 1;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = cor;
        ctx.fill();
        ctx.fillStyle = C.ink;
        ctx.font = `${n === hover || n.chave === selRef.current || n.chave === foco ? "600 " : ""}11px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(n.label, x, y + r + 14);
      }
      ctx.globalAlpha = 1;
    };
    const loop = () => {
      tick();
      draw();
      raf = requestAnimationFrame(loop);
    };
    const pick = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const x = mundo((e.clientX - r.left) / W);
      const y = mundo((e.clientY - r.top) / H);
      const perto = 0.04 / zoomRef.current;
      return nos.find((n) => Math.hypot(n.x - x, n.y - y) < perto) ?? null;
    };
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
      dragging = pick(e);
      if (dragging) cv.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      if (dragging) {
        dragging.x = mundo((e.clientX - r.left) / W);
        dragging.y = mundo((e.clientY - r.top) / H);
        posRef.current.set(dragging.chave, { x: dragging.x, y: dragging.y });
        if (REDUCED) draw();
      } else {
        hover = pick(e);
        if (REDUCED) draw();
      }
    };
    const onUp = (e: PointerEvent) => {
      // clique (sem arrasto) seleciona o nó — o card decide o que abrir
      if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 5) {
        setSel(dragging ? dragging.chave : "");
      }
      dragging = null;
      downAt = null;
    };
    const onResize = () => {
      resize();
      if (REDUCED) draw();
    };

    resize();
    if (REDUCED) {
      for (let i = 0; i < 400; i++) tick();
      draw();
    } else {
      loop();
    }
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    addEventListener("resize", onResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      removeEventListener("resize", onResize);
    };
    // sel e zoom entram nas dependências pelo modo reduzido (sem loop): o
    // desenho é único, então halo e escala precisam de um redesenho novo.
  }, [logged, grafo, visiveis, foco, sel, zoom]);

  // Esc: fecha o card; sem card, sai do foco
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        if (selRef.current) setSel("");
        else setFoco("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!logged) {
    return (
      <div className="view-in">
        <div className="soon">
          <h2>Grafo</h2>
          <p>Entre com seu e-mail para ver as conexões entre as suas notas, projetos e pessoas.</p>
          <span className="chip">Fase 3 · notas conectadas</span>
        </div>
      </div>
    );
  }

  const todosOn = TIPO_LABEL.every(([t]) => tipos[t]);
  // busca do foco: containers, notas e pessoas com o termo digitado
  const sugestoes = busca.trim()
    ? grafo.nos.filter((n) => normalizar(n.nome).includes(normalizar(busca.trim()))).slice(0, 8)
    : [];

  const abrirSel = () => {
    if (!selNo) return;
    if (selNo.tipo === "nota") onAbrirNota(selNo.chave.slice(5));
    else if (selNo.chave.startsWith("c:")) onAbrirContainer(selNo.chave.slice(2));
    else onAbrirPessoas();
  };

  // meta do card: conexões e, para containers, o recheio (como no 12c)
  const metaSel = (() => {
    if (!selNo) return "";
    if (selNo.chave.startsWith("c:")) {
      const id = selNo.chave.slice(2);
      const abertas = tarefas.filter((t) => t.container_id === id && t.status !== "concluida" && t.status !== "algum_dia").length;
      const nNotas = notas.filter((n) => n.container_id === id).length;
      const nPessoas = grafo.arestas.filter(
        ([a, b]) => (a === selNo.chave && b.startsWith("p:")) || (b === selNo.chave && a.startsWith("p:")),
      ).length;
      return `${TIPO_NOME[selNo.tipo]}${selNo.arq ? " · arquivado" : ""} · ${abertas} tarefa${abertas === 1 ? "" : "s"} aberta${abertas === 1 ? "" : "s"} · ${nNotas} nota${nNotas === 1 ? "" : "s"} · ${nPessoas} pessoa${nPessoas === 1 ? "" : "s"}`;
    }
    const g = grau(selNo.chave);
    return `${TIPO_NOME[selNo.tipo]} · ${g} conex${g === 1 ? "ão" : "ões"}`;
  })();

  return (
    <div className="view-in">
      <button className="page-back stagger" style={{ ["--i" as string]: 0 }} onClick={onVoltar}>
        ← Espaços
      </button>
      <p className="year-note stagger" style={{ ["--i" as string]: 0 }}>
        {grafo.nos.length === 0
          ? "O grafo nasce dos seus projetos, áreas e notas — crie e ligue com [[links]]."
          : focoNo
            ? `Em foco: ${focoNo.label}, até ${saltos} salto${saltos === 1 ? "" : "s"} de distância.`
            : "Conexões entre notas, projetos, áreas, recursos e pessoas. Arraste os nós; clique para ver e abrir."}
      </p>
      <div className="pillrow graph-filtros stagger" style={{ ["--i" as string]: 1 }}>
        <button
          className={`gpill${todosOn ? " tudo" : ""}`}
          title="Mostrar todos os tipos"
          onClick={() => setTipos({ nota: true, projeto: true, area: true, recurso: true, pessoa: true })}
        >
          Tudo
        </button>
        {TIPO_LABEL.map(([t, label]) => (
          <button
            key={t}
            className={`gpill${tipos[t] ? " on" : ""}`}
            style={{ ["--gpill" as string]: `var(${COR[t]})` }}
            title={`Mostrar/ocultar ${label.toLowerCase()}`}
            onClick={() => setTipos((prev) => ({ ...prev, [t]: !prev[t] }))}
          >
            <i className="dot" />
            {label}
          </button>
        ))}
        <button
          className={`gpill${comArquivados ? " on" : ""}`}
          style={{ ["--gpill" as string]: "var(--ink-muted)" }}
          title="Arquivados aparecem apagados — o A do PARA sem sair da rede"
          onClick={() => setComArquivados((v) => !v)}
        >
          ▤ Arquivados{arquivados.length ? ` (${arquivados.length})` : ""}
        </button>
        <div className="graph-busca">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="⌕ Focar em uma nota ou projeto…"
            aria-label="Focar em um nó do grafo"
          />
          {sugestoes.length > 0 && (
            <div className="graph-busca-lista">
              {sugestoes.map((n) => (
                <button
                  key={n.chave}
                  onClick={() => {
                    setFoco(n.chave);
                    setSel("");
                    setBusca("");
                  }}
                >
                  <i className="dot" style={{ background: `var(${COR[n.tipo]})` }} />
                  {n.label}
                  <span>{TIPO_NOME[n.tipo]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {focoNo && (
          <button className="graph-foco-chip" onClick={() => setFoco("")} title="Sair do foco">
            Foco: {focoNo.nome} ✕
          </button>
        )}
      </div>
      <div className="graphwrap stagger" style={{ ["--i" as string]: 2 }}>
        <canvas ref={cvRef} className="graphcv" />
        {selNo && (
          <div className="graph-card">
            <div className="graph-card-topo">
              <span className="dot" style={{ background: `var(${COR[selNo.tipo]})` }} />
              <b>{selNo.nome}</b>
            </div>
            <div className="graph-card-meta">{metaSel}</div>
            <div className="graph-card-acoes">
              <button className="abrir" onClick={abrirSel}>
                Abrir {selNo.tipo === "pessoa" ? "pessoas" : TIPO_NOME[selNo.tipo]}
              </button>
              <button
                onClick={() => {
                  setFoco(sel);
                  setSaltos(1);
                  setSel("");
                }}
              >
                Só vizinhos
              </button>
            </div>
          </div>
        )}
        {focoNo && (
          <label className="graph-prof">
            <span>Profundidade</span>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={saltos}
              onChange={(e) => setSaltos(Number(e.target.value))}
            />
            <b>
              {saltos} salto{saltos === 1 ? "" : "s"}
            </b>
          </label>
        )}
        <div className="graph-zoom">
          <button onClick={() => setZoom((z) => Math.min(2.5, z * 1.25))} title="Aproximar">+</button>
          <button onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} title="Afastar">−</button>
          <button onClick={() => setZoom(1)} title="Enquadrar de novo">⌖</button>
        </div>
      </div>
    </div>
  );
}
