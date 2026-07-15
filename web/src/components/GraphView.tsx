"use client";

import { useEffect, useRef } from "react";
import type { Container, Nota, Pessoa } from "@/lib/db";
import { linksDe, pessoasDe } from "@/lib/markdown";
import { normalizar } from "@/lib/parser";

/** Fase 3 — Grafo de conexões (protótipo v6 sobre dados reais):
 *  nós = notas, projetos/áreas/recursos e @pessoas; arestas = [[links]],
 *  agrupamentos e menções. Arraste para reorganizar; clique numa nota abre. */

type Tipo = "nota" | "projeto" | "area" | "recurso" | "pessoa";
type No = { id: string; label: string; tipo: Tipo; x: number; y: number; vx: number; vy: number };

type Props = {
  logged: boolean;
  notas: Nota[];
  containers: Container[];
  pessoas: Pessoa[];
  onAbrirNota: (id: string) => void;
  onAbrirContainer: (id: string) => void;
  onToast: (msg: string) => void;
};

const COR: Record<Tipo, string> = {
  nota: "--accent",
  projeto: "--task",
  area: "--google",
  recurso: "--ink-3",
  pessoa: "--today",
};

export default function GraphView({ logged, notas, containers, pessoas, onAbrirNota, onAbrirContainer, onToast }: Props) {
  const cvRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!logged) return;
    const cv = cvRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;

    // ── monta os nós: TODOS os projetos/áreas/recursos + notas + pessoas citadas.
    //    (antes só containers ligados a notas apareciam — feedback do Raul) ──
    const nos: No[] = [];
    const porChave = new Map<string, No>();
    const addNo = (chave: string, label: string, tipo: Tipo) => {
      let n = porChave.get(chave);
      if (!n) {
        const i = nos.length;
        n = {
          id: chave,
          label: label.length > 26 ? label.slice(0, 24) + "…" : label,
          tipo,
          x: 0.5 + 0.36 * Math.cos((i / 9) * Math.PI * 2 + i * 0.7),
          y: 0.5 + 0.36 * Math.sin((i / 9) * Math.PI * 2 + i * 0.7),
          vx: 0,
          vy: 0,
        };
        porChave.set(chave, n);
        nos.push(n);
      }
      return n;
    };

    const arestas: [No, No][] = [];
    const liga = (a: No, b: No) => {
      if (a !== b && !arestas.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) arestas.push([a, b]);
    };

    for (const c of containers) addNo(`c:${c.id}`, `${c.emoji ? c.emoji + " " : ""}${c.nome}`, c.kind as Tipo);
    // projeto pertence a uma área → aresta estrutural do PARA
    for (const c of containers) {
      if (c.area_id && porChave.has(`c:${c.area_id}`)) liga(porChave.get(`c:${c.id}`)!, porChave.get(`c:${c.area_id}`)!);
    }
    for (const n of notas) addNo(`nota:${n.id}`, n.titulo, "nota");
    for (const n of notas) {
      const eu = porChave.get(`nota:${n.id}`)!;
      if (n.container_id) {
        const c = containers.find((x) => x.id === n.container_id);
        if (c) liga(eu, addNo(`c:${c.id}`, `${c.emoji ? c.emoji + " " : ""}${c.nome}`, c.kind as Tipo));
      }
      for (const t of linksDe(n.md)) {
        const alvoNota = notas.find((x) => normalizar(x.titulo) === normalizar(t));
        if (alvoNota) {
          liga(eu, porChave.get(`nota:${alvoNota.id}`)!);
          continue;
        }
        const alvoC = containers.find((x) => normalizar(x.nome) === normalizar(t));
        if (alvoC) liga(eu, addNo(`c:${alvoC.id}`, `${alvoC.emoji ? alvoC.emoji + " " : ""}${alvoC.nome}`, alvoC.kind as Tipo));
      }
      for (const p of pessoasDe(n.md)) {
        const pe = pessoas.find((x) => normalizar(x.nome) === normalizar(p));
        liga(eu, addNo(`p:${pe?.id ?? p}`, `@${pe?.nome ?? p}`, "pessoa"));
      }
    }

    // ── simulação (a mesma física do protótipo) ──
    const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let raf: number | null = null;
    let dragging: No | null = null;
    let hover: No | null = null;
    let downAt: { x: number; y: number } | null = null;

    const cores = () => {
      const cs = getComputedStyle(document.documentElement);
      const de = (v: string) => cs.getPropertyValue(v).trim();
      return {
        tipo: (t: Tipo) => de(COR[t]),
        line: de("--line"),
        ink: de("--ink-2"),
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
      }
    };
    const draw = () => {
      const C = cores();
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1.2;
      for (const [a, b] of arestas) {
        ctx.beginPath();
        ctx.moveTo(a.x * W, a.y * H);
        ctx.lineTo(b.x * W, b.y * H);
        ctx.stroke();
      }
      for (const n of nos) {
        const r = n.tipo === "projeto" || n.tipo === "area" ? 10 : n.tipo === "nota" ? 7.5 : 6.5;
        ctx.beginPath();
        ctx.arc(n.x * W, n.y * H, r + (n === hover ? 2.5 : 0), 0, Math.PI * 2);
        ctx.fillStyle = C.tipo(n.tipo);
        ctx.fill();
        ctx.fillStyle = C.ink;
        ctx.font = `${n === hover ? "600 " : ""}11px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x * W, n.y * H + r + 14);
      }
    };
    const loop = () => {
      tick();
      draw();
      raf = requestAnimationFrame(loop);
    };
    const pick = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / W;
      const y = (e.clientY - r.top) / H;
      return nos.find((n) => Math.hypot(n.x - x, n.y - y) < 0.04) ?? null;
    };
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
      dragging = pick(e);
      if (dragging) cv.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      if (dragging) {
        dragging.x = (e.clientX - r.left) / W;
        dragging.y = (e.clientY - r.top) / H;
        if (REDUCED) draw();
      } else {
        hover = pick(e);
        if (REDUCED) draw();
      }
    };
    const onUp = (e: PointerEvent) => {
      if (dragging && downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 5) {
        if (dragging.tipo === "nota") onAbrirNota(dragging.id.slice(5));
        else if (dragging.id.startsWith("c:")) onAbrirContainer(dragging.id.slice(2));
        else onToast(`${dragging.label} — as pessoas ainda não têm página própria`);
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
  }, [logged, notas, containers, pessoas, onAbrirNota, onAbrirContainer, onToast]);

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

  return (
    <div className="view-in">
      <p className="year-note stagger" style={{ ["--i" as string]: 0 }}>
        {notas.length === 0 && containers.length === 0
          ? "O grafo nasce dos seus projetos, áreas e notas — crie e ligue com [[links]]."
          : "Conexões entre notas, projetos, áreas, recursos e pessoas. Arraste os nós; clique para abrir a página."}
      </p>
      <div className="graphwrap stagger" style={{ ["--i" as string]: 1 }}>
        <canvas ref={cvRef} className="graphcv" />
        <div className="graphlegend">
          <span><i style={{ background: "var(--accent)" }} />Nota</span>
          <span><i style={{ background: "var(--task)" }} />Projeto</span>
          <span><i style={{ background: "var(--google)" }} />Área</span>
          <span><i style={{ background: "var(--ink-3)" }} />Recurso</span>
          <span><i style={{ background: "var(--today)" }} />Pessoa</span>
        </div>
      </div>
    </div>
  );
}
