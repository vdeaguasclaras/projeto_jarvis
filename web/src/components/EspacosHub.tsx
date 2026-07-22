"use client";

/** Espaços — hub do redesign (tela 11c no desktop, 7a no celular).
 *  Grid de 3 colunas com miniaturas vivas: Projetos (progresso + próxima ação),
 *  Áreas (saúde 15b), Pessoas (cobranças), Grafo (miniatura), Notas recentes e
 *  Arquivo. Os títulos e cards navegam para as páginas dedicadas. */

import { useMemo, useState } from "react";
import { corDoContainer } from "@/lib/cores";
import { linksDe } from "@/lib/markdown";
import { normalizar } from "@/lib/parser";
import { saudeDaArea, SAUDE_LABEL, type Saude } from "@/lib/saude";
import { hojeISO, somaDias, type Container, type Kind, type Nota, type Pessoa, type ProjetoArea, type Tarefa } from "@/lib/db";
import { VERSAO } from "@/lib/versao";

type Props = {
  containers: Container[];
  arquivados: Container[];
  tarefas: Tarefa[];
  notas: Nota[];
  pessoas: Pessoa[];
  projetoAreas: ProjetoArea[];
  onOpen: (id: string) => void;
  onPessoas: () => void;
  onNotas: () => void;
  onAbrirNota: (id: string) => void;
  onGrafo: () => void;
  onArquivo: () => void;
  onNovo: (kind: Kind) => void;
  onLista: (kinds: Kind[]) => void;
};

const AVATAR = [
  { bg: "var(--terracotta-bg)", ink: "var(--terracotta-deep)" },
  { bg: "var(--green-bg)", ink: "var(--green-deep)" },
  { bg: "var(--purple-bg)", ink: "var(--purple-deep)" },
];

const SAUDE_COR: Record<Saude, string> = {
  em_dia: "var(--green)",
  atencao: "var(--terracotta)",
  quieta: "var(--warning-dot)",
};

function ddmm(iso: string): string {
  return iso.split("-").reverse().slice(0, 2).join("/");
}

function quandoFoi(iso: string, hoje: string): string {
  const d = iso.slice(0, 10);
  if (d === hoje) return "hoje";
  if (d === somaDias(hoje, -1)) return "ontem";
  return ddmm(d);
}

export default function EspacosHub(p: Props) {
  const hoje = hojeISO();
  const [busca, setBusca] = useState("");
  const bate = (nome: string) => !busca || normalizar(nome).includes(normalizar(busca));

  const projetos = p.containers.filter((c) => c.kind === "projeto" && bate(c.nome));
  const areas = p.containers.filter((c) => c.kind === "area" && bate(c.nome));
  const recursos = p.containers.filter((c) => c.kind === "recurso" && bate(c.nome));

  const dadosProjeto = (c: Container) => {
    const doProjeto = p.tarefas.filter((t) => t.container_id === c.id);
    const abertas = doProjeto.filter((t) => t.status !== "concluida" && t.status !== "algum_dia");
    const feitas = doProjeto.filter((t) => t.status === "concluida").length;
    const pct = doProjeto.length ? Math.round((feitas / doProjeto.length) * 100) : 0;
    const proxima = [...abertas].sort((a, b) => ((a.prazo ?? "9999") < (b.prazo ?? "9999") ? -1 : 1))[0] ?? null;
    return { abertas: abertas.length, pct, proxima };
  };

  const dadosPessoas = useMemo(
    () =>
      p.pessoas
        .map((q, i) => {
          const pend = p.tarefas.filter((t) => t.responsavel_id === q.id && t.status === "em_espera");
          const cobranca = pend.map((t) => t.prazo).filter(Boolean).sort()[0] ?? null;
          return { pessoa: q, avatar: AVATAR[i % AVATAR.length], pend: pend.length, cobranca };
        })
        .filter((d) => bate(d.pessoa.nome))
        .sort((a, b) => {
          if (!!a.pend !== !!b.pend) return a.pend ? -1 : 1;
          return (a.cobranca ?? "9999") < (b.cobranca ?? "9999") ? -1 : 1;
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.pessoas, p.tarefas, busca],
  );

  const notasRecentes = p.notas
    .filter((n) => bate(n.titulo))
    .slice()
    .sort((a, b) => (a.atualizada_em > b.atualizada_em ? -1 : 1));

  // Conexões do grafo: notas agrupadas + [[links]] + projeto↔área
  const conexoes = useMemo(
    () =>
      p.projetoAreas.length +
      p.notas.filter((n) => n.container_id).length +
      p.notas.reduce((soma, n) => soma + linksDe(n.md).length, 0),
    [p.notas, p.projetoAreas],
  );

  const rotuloCobranca = (iso: string | null) => {
    if (!iso) return "sem data";
    if (iso < hoje) return "cobrar já";
    if (iso === hoje) return "cobrar hoje";
    if (iso === somaDias(hoje, 1)) return "cobrar amanhã";
    return `cobrar ${ddmm(iso)}`;
  };

  // Miniatura do grafo: centro = projeto com mais abertas; satélites decorativos
  const centro = [...projetos].sort((a, b) => dadosProjeto(b).abertas - dadosProjeto(a).abertas)[0] ?? null;
  const SATS = [
    { x: 60, y: 25, r: 8, cor: "var(--purple)" },
    { x: 200, y: 30, r: 8, cor: "var(--purple)" },
    { x: 90, y: 72, r: 7, cor: "var(--green)" },
    { x: 190, y: 70, r: 7, cor: "var(--terracotta-deep)" },
  ];

  return (
    <div className="view-in">
      {/* ── Desktop: grid 11c ── */}
      <div className="hub-desktop">
        <div className="esp-head">
          <h1>Espaços</h1>
          <input
            className="esp-busca"
            placeholder="⌕ Buscar em tudo…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="hub-grid">
          <div className="hub-col">
            <div className="hub-card cresce">
              <div className="hub-card-head">
                <button className="hub-tit" onClick={() => p.onLista(["projeto"])}>Projetos</button>
                <button className="hub-mais" title="Novo projeto" onClick={() => p.onNovo("projeto")}>+</button>
              </div>
              {projetos.length === 0 && <p className="empty-hint">{busca ? "nenhum projeto bate com a busca" : "Nenhum ainda — projetos têm fim; crie no +"}</p>}
              {projetos.map((c) => {
                const d = dadosProjeto(c);
                const cor = corDoContainer(c.id);
                return (
                  <button key={c.id} className="hub-proj" onClick={() => p.onOpen(c.id)}>
                    <div className="hub-proj-l1">
                      <span className="hub-dot" style={{ background: cor?.borda ?? "var(--green)" }} />
                      <span className="hub-proj-nome">{c.emoji ? `${c.emoji} ` : ""}{c.nome}</span>
                      <span className="hub-n">{d.abertas} aberta{d.abertas !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="hub-prog"><i style={{ width: `${d.pct}%`, background: cor?.borda ?? "var(--green)" }} /></div>
                    {d.proxima && (
                      <div className="hub-proj-prox">
                        próxima: {d.proxima.titulo}
                        {d.proxima.prazo ? ` · ${d.proxima.prazo === hoje ? "hoje" : ddmm(d.proxima.prazo)}` : ""}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="hub-card">
              <div className="hub-card-head">
                <button className="hub-tit" onClick={() => p.onLista(["area", "recurso"])}>Áreas</button>
                <button className="hub-mais" title="Nova área" onClick={() => p.onNovo("area")}>+</button>
              </div>
              {areas.length === 0 && <p className="empty-hint">{busca ? "nenhuma área bate com a busca" : "O contínuo mora aqui — Financeiro, Família…"}</p>}
              <div className="hub-areas">
                {areas.map((c) => {
                  const escopo = [c.id, ...p.projetoAreas.filter((l) => l.area_id === c.id).map((l) => l.projeto_id)];
                  const saude = saudeDaArea(escopo, p.tarefas, p.notas);
                  const nT = p.tarefas.filter((t) => t.container_id === c.id && t.status !== "concluida" && t.status !== "algum_dia").length;
                  const nN = p.notas.filter((n) => n.container_id === c.id).length;
                  return (
                    <button key={c.id} className="hub-area" onClick={() => p.onOpen(c.id)}>
                      <div className="hub-area-l1">
                        <span className="hub-area-nome">▣ {c.emoji ? `${c.emoji} ` : ""}{c.nome}</span>
                        <span className="hub-saude" style={{ background: SAUDE_COR[saude] }} title={SAUDE_LABEL[saude]} />
                      </div>
                      <small className={saude !== "em_dia" ? `saude-${saude}` : undefined}>
                        {saude === "em_dia"
                          ? `${nT} tarefa${nT !== 1 ? "s" : ""}${nN ? ` · ${nN} nota${nN !== 1 ? "s" : ""}` : ""}`
                          : SAUDE_LABEL[saude]}
                      </small>
                    </button>
                  );
                })}
              </div>
              {recursos.length > 0 && (
                <div className="hub-recursos">
                  ◆ Recursos: {recursos.map((r, i) => (
                    <button key={r.id} className="hub-rec" onClick={() => p.onOpen(r.id)}>
                      {i > 0 ? " · " : ""}{r.emoji ? `${r.emoji} ` : ""}{r.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="hub-col">
            <div className="hub-card cresce">
              <div className="hub-card-head">
                <button className="hub-tit" onClick={p.onPessoas}>Pessoas</button>
                <button className="hub-mais" title="Abrir Pessoas" onClick={p.onPessoas}>›</button>
              </div>
              {dadosPessoas.length === 0 && <p className="empty-hint">{busca ? "ninguém bate com a busca" : "Pessoas nascem do @nome na captura."}</p>}
              {dadosPessoas.slice(0, 5).map((d) => (
                <button key={d.pessoa.id} className="hub-pessoa" onClick={p.onPessoas}>
                  <span className="pp-ava" style={{ background: d.avatar.bg, color: d.avatar.ink }}>
                    {d.pessoa.nome.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hub-pessoa-nome">@{d.pessoa.nome}</span>
                  {d.pend > 0 ? (
                    <span className={`tchip${d.cobranca && d.cobranca <= somaDias(hoje, 1) ? " hoje" : ""}`}>
                      {rotuloCobranca(d.cobranca)}
                    </span>
                  ) : (
                    <span className="hub-n">em dia</span>
                  )}
                </button>
              ))}
            </div>
            <div className="hub-card">
              <div className="hub-card-head">
                <button className="hub-tit" onClick={p.onGrafo}>Grafo</button>
              </div>
              <svg className="hub-grafo" viewBox="0 0 260 90" onClick={p.onGrafo} role="button" aria-label="Abrir o grafo">
                {SATS.map((s, i) => (
                  <line key={i} x1="130" y1="45" x2={s.x} y2={s.y} stroke="var(--border)" strokeWidth="1.5" />
                ))}
                <circle cx="130" cy="45" r="12" fill={centro ? corDoContainer(centro.id)?.borda ?? "var(--terracotta)" : "var(--terracotta)"} />
                {SATS.map((s, i) => (
                  <circle key={`c${i}`} cx={s.x} cy={s.y} r={s.r} fill={s.cor} />
                ))}
              </svg>
              <button className="hub-grafo-lbl" onClick={p.onGrafo}>
                {conexoes} conex{conexoes === 1 ? "ão" : "ões"} · abrir grafo ›
              </button>
            </div>
          </div>

          <div className="hub-col">
            <div className="hub-card cresce hub-notas">
              <div className="hub-card-head">
                <button className="hub-tit" onClick={p.onNotas}>Notas recentes</button>
                <span className="hub-n">{p.notas.length}</span>
              </div>
              {notasRecentes.length === 0 && <p className="empty-hint">{busca ? "nenhuma nota bate com a busca" : "A primeira nota nasce do N ou do Despacho."}</p>}
              {notasRecentes.slice(0, 5).map((n) => {
                const grupo = p.containers.find((c) => c.id === n.container_id) ?? null;
                return (
                  <button key={n.id} className="hub-nota" onClick={() => p.onAbrirNota(n.id)}>
                    <div className="hub-nota-t">{n.titulo}</div>
                    <small>
                      {quandoFoi(n.atualizada_em, hoje)} ·{" "}
                      {grupo ? <span className="hub-nota-grupo">[[{grupo.nome}]]</span> : "sem grupo"}
                    </small>
                  </button>
                );
              })}
              <button className="hub-todas" onClick={p.onNotas}>todas as notas ›</button>
            </div>
            <button className="hub-arquivo" onClick={p.onArquivo}>
              <span>▤</span>
              <span className="hub-arquivo-t">Arquivo — o que já cumpriu seu papel{p.arquivados.length ? ` · ${p.arquivados.length}` : ""}</span>
              <span>›</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Celular: cards 7a ── */}
      <div className="hub-mobile">
        <h1>Espaços</h1>
        <p className="esp-sub">Tudo o que você guarda, organizado à sua maneira.</p>
        <div className="hub-m-grid">
          <button className="hub-m-card" onClick={() => p.onLista(["projeto"])}>
            <span className="hub-m-ico" style={{ color: "var(--terracotta)" }}>▶</span>
            <b>Projetos</b>
            <small>
              {projetos.length} ativo{projetos.length !== 1 ? "s" : ""} ·{" "}
              {projetos.reduce((s, c) => s + dadosProjeto(c).abertas, 0)} tarefas
            </small>
          </button>
          <button className="hub-m-card" onClick={() => p.onLista(["area", "recurso"])}>
            <span className="hub-m-ico" style={{ color: "var(--green)" }}>▣</span>
            <b>Áreas</b>
            <small>{areas.length ? areas.slice(0, 2).map((a) => a.nome).join(" · ") : "o contínuo mora aqui"}</small>
          </button>
          <button className="hub-m-card" onClick={p.onPessoas}>
            <span className="hub-m-ico" style={{ color: "var(--terracotta-deep)" }}>@</span>
            <b>Pessoas</b>
            <small>
              {(() => {
                const n = dadosPessoas.filter((d) => d.pend > 0).length;
                return n ? `${n} cobrança${n !== 1 ? "s" : ""} pendente${n !== 1 ? "s" : ""}` : "todo mundo em dia";
              })()}
            </small>
          </button>
          <button className="hub-m-card" onClick={p.onNotas}>
            <span className="hub-m-ico" style={{ color: "var(--purple)" }}>✎</span>
            <b>Notas</b>
            <small>{p.notas.length} nota{p.notas.length !== 1 ? "s" : ""}</small>
          </button>
          <button className="hub-m-card" onClick={p.onGrafo}>
            <span className="hub-m-ico" style={{ color: "var(--green-deep)" }}>⬡</span>
            <b>Grafo</b>
            <small>conexões entre tudo</small>
          </button>
          <button className="hub-m-card" onClick={p.onArquivo}>
            <span className="hub-m-ico" style={{ color: "var(--ink-muted)" }}>▤</span>
            <b style={{ color: "var(--ink-secondary)" }}>Arquivo</b>
            <small>o que já cumpriu seu papel</small>
          </button>
        </div>
        <div className="esp-dica">
          Recursos moram dentro de cada Área — as referências continuam lá.
        </div>
      </div>

      <p className="versao" style={{ marginTop: 18 }}>Kairós v{VERSAO} · em teste</p>
    </div>
  );
}
