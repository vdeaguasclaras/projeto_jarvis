"use client";

import { useEffect, useMemo, useState } from "react";
import {
  contarTriadasEntre,
  criarEvento,
  criarTarefa,
  definirPrioridades,
  hojeISO,
  incubadasDormindo,
  listEventos,
  listPrioridades,
  mudarPrazoTarefa,
  registrarRitual,
  segundaDe,
  sequenciaRevisoes,
  somaDias,
  type Container,
  type Evento,
  type Tarefa,
} from "@/lib/db";
import { resolveDataCaptura } from "@/lib/parser";
import { isoDe } from "@/components/TimeGrid";

/** Revisão semanal (domingo) — os 7 passos do protótipo v6 sobre dados reais:
 *  fechar a semana que termina (placar) e decidir a que começa
 *  (prioridades, vencidas, bloco de foco, projeto parado, inbox). */

type Props = {
  userId: string;
  tarefas: Tarefa[];
  containers: Container[];
  inboxCount: number;
  onClose: () => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const DIAS_LONGOS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function numeroSemanaISO(dataISO: string): number {
  const [a, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  const dow = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dow);
  const ano1 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - ano1.getTime()) / 86400000 + 1) / 7);
}

function diaDoMes(dataISO: string): number {
  return Number(dataISO.split("-")[2]);
}

/** rótulo "seg 13" para um dia da semana-alvo */
function rotuloDia(semanaISO: string, idx: number): string {
  return `${DIAS[idx]} ${diaDoMes(somaDias(semanaISO, idx))}`;
}

function horaDe(ts: string): number {
  const d = new Date(ts);
  return d.getHours() + d.getMinutes() / 60;
}

function fmtHora(h: number): string {
  const min = Math.round((h % 1) * 60);
  return `${Math.floor(h)}h${min ? String(min).padStart(2, "0") : ""}`;
}

type Vaga = { diaIdx: number; ini: number; fim: number };

/** Maiores janelas livres (≥ 2h, 9h–18h, seg–sex) da semana-alvo, descontando os eventos. */
function vagasDeFoco(semanaISO: string, eventos: Evento[]): Vaga[] {
  const porDia: Vaga[] = [];
  for (let i = 0; i < 5; i++) {
    const dataISO = somaDias(semanaISO, i);
    const ocupados = eventos
      .filter((e) => !e.dia_inteiro)
      .filter((e) => {
        const d = new Date(e.inicio);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === dataISO;
      })
      .map((e) => [horaDe(e.inicio), horaDe(e.fim)] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    let cursor = 9;
    let melhor: Vaga | null = null;
    const registra = (ini: number, fim: number) => {
      if (fim - ini >= 2 && (!melhor || fim - ini > melhor.fim - melhor.ini)) melhor = { diaIdx: i, ini, fim };
    };
    for (const [ini, fim] of ocupados) {
      registra(cursor, Math.min(ini, 18));
      cursor = Math.max(cursor, fim);
    }
    registra(cursor, 18);
    if (melhor) porDia.push(melhor);
  }
  return porDia
    .sort((a, b) => b.fim - b.ini - (a.fim - a.ini))
    .slice(0, 3)
    .map((v) => ({ ...v, fim: Math.min(v.fim, v.ini + 3) })); // bloco de no máx. 3h
}

/** "qua 9h", "sex 14h-16h" → vaga na semana-alvo (2h se o fim não vier). */
function parseFocoLivre(texto: string): Vaga | null {
  const m = texto
    .toLowerCase()
    .match(/\b(seg|ter|qua|qui|sex|s[áa]b|dom)\w*\b\D*?(\d{1,2})h(?:\d{2})?(?:\D{0,5}(\d{1,2})h)?/);
  if (!m) return null;
  const diaIdx = DIAS.indexOf(m[1].replace("sab", "sáb"));
  if (diaIdx < 0) return null;
  const ini = Number(m[2]);
  const fim = m[3] ? Number(m[3]) : ini + 2;
  if (ini < 0 || ini > 23 || fim <= ini || fim > 24) return null;
  return { diaIdx, ini, fim };
}

export default function RevisaoModal({ userId, tarefas, containers, inboxCount, onClose, onChanged, onToast }: Props) {
  const hoje = hojeISO();
  const semAtual = segundaDe(hoje);
  const semProx = somaDias(semAtual, 7);
  const numAtual = numeroSemanaISO(semAtual);
  const numProx = numeroSemanaISO(semProx);

  // ── dados que o modal busca sozinho ──
  const [evAtual, setEvAtual] = useState<Evento[]>([]);
  const [evProx, setEvProx] = useState<Evento[]>([]);
  const [prioAtualIds, setPrioAtualIds] = useState<string[]>([]);
  const [prioProxIds, setPrioProxIds] = useState<string[] | null>(null); // null = nada salvo
  const [triadas, setTriadas] = useState(0);
  const [incubadas, setIncubadas] = useState<{ total: number; volta: string | null }>({ total: 0, volta: null });
  const [seqRev, setSeqRev] = useState(0);
  const [pronto, setPronto] = useState(false);
  // Uma etapa por tela (feedback do Raul) — mais limpo de ler e responder
  const [passo, setPasso] = useState(0);
  const TOTAL_PASSOS = 7;

  useEffect(() => {
    (async () => {
      const [ea, ep, pa, pp, tr, inc, sr] = await Promise.all([
        listEventos(semAtual, semProx),
        listEventos(semProx, somaDias(semProx, 7)),
        listPrioridades("semana", semAtual),
        listPrioridades("semana", semProx),
        contarTriadasEntre(semAtual, somaDias(semAtual, 7)),
        incubadasDormindo(),
        sequenciaRevisoes(),
      ]);
      setEvAtual(ea);
      setEvProx(ep);
      // as avulsas (tarefa_id null) ficam de fora da revisão — são pontuais do dia
      setPrioAtualIds(pa.map((p) => p.tarefa_id).filter((id): id is string => id !== null));
      setPrioProxIds(pp.length ? pp.map((p) => p.tarefa_id).filter((id): id is string => id !== null) : null);
      setTriadas(tr);
      setIncubadas(inc);
      setSeqRev(sr);
      setPronto(true);
    })();
    // âncoras derivam de hojeISO() — estáveis durante a vida do modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── passo 1: como foi a semana ──
  const fimSemAtual = somaDias(semAtual, 6);
  const abertas = tarefas.filter((t) => t.status !== "concluida" && t.status !== "algum_dia");
  const concluidasSemana = tarefas.filter(
    (t) => t.status === "concluida" && (t.concluida_em ?? "").slice(0, 10) >= semAtual && (t.concluida_em ?? "").slice(0, 10) <= fimSemAtual,
  );
  const pendentesSemana = abertas.filter((t) => t.prazo !== null && t.prazo <= fimSemAtual);
  const totalSemana = concluidasSemana.length + pendentesSemana.length;
  const pct = totalSemana ? Math.round((concluidasSemana.length / totalSemana) * 100) : 100;

  const melhorDia = useMemo(() => {
    const porDia = new Map<number, number>();
    for (const t of concluidasSemana) {
      const d = new Date(t.concluida_em!);
      const idx = (d.getDay() + 6) % 7;
      porDia.set(idx, (porDia.get(idx) ?? 0) + 1);
    }
    let melhor: [number, number] | null = null;
    for (const [idx, n] of porDia) if (!melhor || n > melhor[1]) melhor = [idx, n];
    return melhor ? { nome: DIAS_LONGOS[melhor[0]], n: melhor[1] } : null;
  }, [concluidasSemana]);

  const horasFoco = useMemo(
    () =>
      evAtual
        .filter((e) => e.titulo.toLowerCase().includes("foco"))
        .reduce((soma, e) => soma + (new Date(e.fim).getTime() - new Date(e.inicio).getTime()) / 3600000, 0),
    [evAtual],
  );

  const prioAtual = prioAtualIds
    .map((id) => tarefas.find((t) => t.id === id))
    .filter((t): t is Tarefa => !!t);

  // ── passo 2: vislumbre da próxima semana ──
  const vislumbre = useMemo(() => {
    const dias = Array.from({ length: 5 }, () => ({ n: 0, horas: 0 }));
    for (const e of evProx.filter((x) => !x.dia_inteiro)) {
      const d = new Date(e.inicio);
      const idx = (d.getDay() + 6) % 7;
      if (idx > 4) continue;
      dias[idx].n++;
      dias[idx].horas += (new Date(e.fim).getTime() - d.getTime()) / 3600000;
    }
    return dias;
  }, [evProx]);
  const maisCheio = vislumbre.reduce((m, d, i) => (d.horas > vislumbre[m].horas ? i : m), 0);
  const maisLivre = vislumbre.reduce((m, d, i) => (d.horas < vislumbre[m].horas ? i : m), 0);

  // ── passo 3: prioridades da próxima semana ──
  const candidatas = useMemo(
    () =>
      tarefas
        .filter((t) => t.status === "a_fazer" || t.status === "em_andamento")
        .sort((a, b) => ((a.prazo ?? "9999") < (b.prazo ?? "9999") ? -1 : 1))
        .slice(0, 24),
    [tarefas],
  );
  const [selPrio, setSelPrio] = useState<string[]>([]);
  const [prioFeito, setPrioFeito] = useState(false);
  useEffect(() => {
    if (!pronto) return;
    // Kairós propõe: salvas da próxima semana, senão as com prazo até o fim dela
    const sugeridas =
      prioProxIds ??
      candidatas
        .filter((t) => t.prazo !== null && t.prazo <= somaDias(semProx, 6))
        .slice(0, 3)
        .map((t) => t.id);
    setSelPrio(sugeridas.filter((id) => candidatas.some((t) => t.id === id)).slice(0, 3));
    // só na carga inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto]);

  const togglePrio = (id: string) => {
    setPrioFeito(false);
    setSelPrio((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        onToast("Máximo de 3 prioridades — desmarque uma antes");
        return prev;
      }
      return [...prev, id];
    });
  };

  const aplicarPrio = async () => {
    const err = await definirPrioridades(userId, "semana", semProx, selPrio.map((id) => ({ tarefa_id: id })));
    if (err) return onToast(`Erro ao salvar: ${err}`);
    setPrioFeito(true);
    onChanged();
    onToast(selPrio.length ? `Prioridades da semana ${numProx} definidas (${selPrio.length}) ★` : "Semana sem prioridades marcadas");
  };

  // ── passo 4: vencidas ──
  const vencidas = abertas.filter((t) => t.prazo !== null && t.prazo < hoje).slice(0, 6);
  const [resched, setResched] = useState<Record<string, string>>({}); // tarefa → ISO ou "livre"
  const [reschedLivre, setReschedLivre] = useState<Record<string, string>>({});
  const [reschedFeito, setReschedFeito] = useState(false);
  const diaSugerido = (i: number) => somaDias(semProx, i % 4); // espalha entre seg–qui

  const aplicarResched = async () => {
    let ok = 0;
    for (let i = 0; i < vencidas.length; i++) {
      const t = vencidas[i];
      const escolha = resched[t.id] ?? diaSugerido(i);
      const prazo = escolha === "livre" ? resolveDataCaptura(reschedLivre[t.id]?.trim() || null) : escolha;
      if (!prazo) {
        onToast(`Não entendi a data de "${t.titulo.slice(0, 32)}" — ex.: 24/07, dia 24, próxima sexta`);
        return;
      }
      const err = await mudarPrazoTarefa(t.id, prazo);
      if (err) return onToast(`Erro ao reagendar: ${err}`);
      ok++;
    }
    setReschedFeito(true);
    onChanged();
    onToast(`${ok} tarefa${ok > 1 ? "s" : ""} reagendada${ok > 1 ? "s" : ""} ✓ — nada fica para trás`);
  };

  // ── passo 5: bloco de foco ──
  const vagas = useMemo(() => vagasDeFoco(semProx, evProx), [semProx, evProx]);
  const [focoSel, setFocoSel] = useState<number | "livre">(0);
  const [focoLivre, setFocoLivre] = useState("");
  const [focoFeito, setFocoFeito] = useState(false);

  const aplicarFoco = async () => {
    const vaga = focoSel === "livre" ? parseFocoLivre(focoLivre) : vagas[focoSel];
    if (!vaga) {
      onToast('Não entendi o horário — ex.: "seg 14h-16h"');
      return;
    }
    const dataISO = somaDias(semProx, vaga.diaIdx);
    const err = await criarEvento(userId, {
      titulo: "🎯 Foco protegido",
      inicio: isoDe(dataISO, vaga.ini),
      fim: isoDe(dataISO, vaga.fim),
    });
    if (err) return onToast(`Erro ao reservar: ${err}`);
    setFocoFeito(true);
    onChanged();
    onToast(`Bloco de foco reservado: ${rotuloDia(semProx, vaga.diaIdx)} · ${fmtHora(vaga.ini)}–${fmtHora(vaga.fim)} ✓`);
  };

  // ── passo 6: projeto parado ──
  const parado = useMemo(() => {
    const projetos = containers.filter((c) => c.kind === "projeto");
    let pior: { c: Container; dias: number } | null = null;
    for (const c of projetos) {
      const doProjeto = tarefas.filter((t) => t.container_id === c.id);
      if (!doProjeto.some((t) => t.status !== "concluida" && t.status !== "algum_dia")) continue;
      const ultima = doProjeto
        .flatMap((t) => [t.criada_em, t.concluida_em].filter((x): x is string => !!x))
        .sort()
        .pop();
      if (!ultima) continue;
      const dias = Math.floor((new Date(`${hoje}T00:00`).getTime() - new Date(ultima).getTime()) / 86400000);
      if (dias >= 10 && (!pior || dias > pior.dias)) pior = { c, dias };
    }
    return pior;
  }, [containers, tarefas, hoje]);
  const [projTitulo, setProjTitulo] = useState("");
  const [projDia, setProjDia] = useState(0);
  const [projFeito, setProjFeito] = useState(false);
  useEffect(() => {
    if (parado) setProjTitulo(`Definir o próximo passo de ${parado.c.nome}`);
  }, [parado]);

  const aplicarProj = async () => {
    if (!parado || !projTitulo.trim()) return;
    const { err } = await criarTarefa(userId, {
      titulo: projTitulo.trim(),
      status: "a_fazer",
      prazo: somaDias(semProx, projDia),
      container_id: parado.c.id,
    });
    if (err) return onToast(`Erro ao criar: ${err}`);
    setProjFeito(true);
    onChanged();
    onToast(`Próximo passo criado em "${parado.c.nome}" ✓ — projeto destravado`);
  };

  // ── conclusão ──
  const concluir = async () => {
    await registrarRitual(userId, "revisao_semana", {
      semana: numAtual,
      concluidas: concluidasSemana.length,
      total: totalSemana,
      pct,
      triadas,
      vencidas_reagendadas: reschedFeito ? vencidas.length : 0,
      prioridades: prioFeito ? selPrio.length : 0,
    });
    onChanged();
    onToast(`Revisão semanal concluída — semana ${numProx} organizada ✓ 🔥 ${seqRev + 1} seguida${seqRev + 1 > 1 ? "s" : ""}`);
    onClose();
  };

  const [aH, mH, dH] = hoje.split("-").map(Number);
  const hojeIdx = (new Date(aH, mH - 1, dH).getDay() + 6) % 7;
  const pill = (on: boolean) => `pill-opt${on ? " on" : ""}`;
  const statusPrio = (t: Tarefa) =>
    t.status === "concluida" ? "✓" : t.status === "em_andamento" ? "parcial" : "não andou";

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label="Revisão semanal">
          <div className="modal-pad">
            <h2>Revisão semanal</h2>
            <p className="sub">
              {DIAS_LONGOS[hojeIdx].replace(/^./, (c) => c.toUpperCase())}, {dH} de {MESES[mH - 1]} · fechar a semana {numAtual}, decidir a semana {numProx}
            </p>

            {!pronto ? (
              <p className="sub">Carregando a sua semana…</p>
            ) : (
              <>
                {passo === 0 && (
                <div className="wk-step-unico">
                {/* 1 · placar da semana que fecha */}
                <div className="wk-step">
                  <span className="wk-num">1</span>
                  <div style={{ flex: 1 }}>
                    <b>Como foi a semana {numAtual}</b>
                    <div className="game-row">
                      <div className="gamebar">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                      <span className="game-lbl">
                        <b>{pct}%</b> concluído
                        {seqRev > 0 && (
                          <>
                            {" "}· 🔥 <b>{seqRev} revis{seqRev > 1 ? "ões" : "ão"}</b> semanais seguidas
                          </>
                        )}
                        {melhorDia && (
                          <>
                            {" "}· melhor dia: <b>{melhorDia.nome}</b> ({melhorDia.n} ✓)
                          </>
                        )}
                      </span>
                    </div>
                    <div className="wk-stats">
                      <span className="chip">
                        {concluidasSemana.length} de {totalSemana} tarefas concluídas
                      </span>
                      {horasFoco > 0 && <span className="chip">{Math.round(horasFoco)}h de foco protegido</span>}
                      <span className="chip muted">{triadas} capturas triadas</span>
                      {vencidas.length > 0 && (
                        <span className="chip muted" style={{ color: "var(--today)" }}>
                          {vencidas.length} vencida{vencidas.length > 1 ? "s" : ""} ↓ passo 4
                        </span>
                      )}
                    </div>
                    {prioAtual.length > 0 && (
                      <p style={{ marginTop: 8 }}>
                        Prioridades da {numAtual}:{" "}
                        {prioAtual.map((t, i) => (
                          <span key={t.id}>
                            {i > 0 && " · "}
                            {t.titulo} <strong>{statusPrio(t)}</strong>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>

                </div>
                )}
                {passo === 1 && (
                <div className="wk-step-unico">
                {/* 2 · vislumbre da semana que vem */}
                <div className="wk-step">
                  <span className="wk-num">2</span>
                  <div style={{ flex: 1 }}>
                    <b>
                      Vislumbre da semana {numProx} · {evProx.length} compromisso{evProx.length !== 1 ? "s" : ""}
                    </b>
                    <div className="wk-glance">
                      {vislumbre.map((d, i) => (
                        <span key={i} className={d.horas >= 5 ? "warn" : ""}>
                          {DIAS[i]}
                          <b>{d.horas >= 5 ? `${Math.round(d.horas)}h ⚠` : d.n}</b>
                        </span>
                      ))}
                    </div>
                    <p>
                      {evProx.length === 0
                        ? "Agenda livre — bom para blocos de foco."
                        : vislumbre[maisCheio].horas >= 5
                          ? `${DIAS_LONGOS[maisCheio].replace(/^./, (c) => c.toUpperCase())} está tomada por compromissos; ${DIAS_LONGOS[maisLivre]} é o dia mais livre.`
                          : `${DIAS_LONGOS[maisLivre].replace(/^./, (c) => c.toUpperCase())} é o dia mais livre.`}
                    </p>
                  </div>
                </div>

                </div>
                )}
                {passo === 2 && (
                <div className="wk-step-unico">
                {/* 3 · prioridades da próxima semana */}
                <div className="wk-step">
                  <span className="wk-num">3</span>
                  <div style={{ flex: 1 }}>
                    <b>Decisão · Prioridades da semana {numProx}</b>
                    <p>Escolha até 3 — vão aparecer no topo do Dia e da Semana.</p>
                    {candidatas.length === 0 ? (
                      <p>Nenhuma tarefa aberta — capture algo primeiro.</p>
                    ) : (
                      <div className="pillrow" style={{ marginTop: 8 }}>
                        {candidatas.map((t) => (
                          <button key={t.id} className={pill(selPrio.includes(t.id))} onClick={() => togglePrio(t.id)}>
                            {containers.find((c) => c.id === t.container_id)?.emoji ?? ""} {t.titulo}
                          </button>
                        ))}
                      </div>
                    )}
                    {candidatas.length > 0 && (
                      <span className="chip" style={{ cursor: "pointer" }} onClick={aplicarPrio}>
                        {prioFeito ? "Prioridades definidas ✓" : "Definir prioridades →"}
                      </span>
                    )}
                  </div>
                </div>

                </div>
                )}
                {passo === 3 && (
                <div className="wk-step-unico">
                {/* 4 · vencidas */}
                <div className="wk-step">
                  <span className="wk-num">4</span>
                  <div style={{ flex: 1 }}>
                    <b>
                      Decisão ·{" "}
                      {vencidas.length
                        ? `${vencidas.length} tarefa${vencidas.length > 1 ? "s" : ""} venceu${vencidas.length > 1 ? "ram" : ""} sem conclusão`
                        : "Nada venceu sem conclusão"}
                    </b>
                    {vencidas.length === 0 ? (
                      <p>Semana limpa — nenhuma tarefa ficou para trás ✓</p>
                    ) : (
                      <>
                        <p>
                          O Kairós <strong>sugere</strong> novos dias (pré-selecionados) — troque se preferir outros.
                        </p>
                        {vencidas.map((t, i) => {
                          const escolha = resched[t.id] ?? diaSugerido(i);
                          return (
                            <div key={t.id}>
                              <div className="flab">
                                {t.titulo} · venceu {t.prazo!.split("-").reverse().slice(0, 2).join("/")}
                              </div>
                              <div className="pillrow">
                                {[0, 1, 2, 3].map((d) => {
                                  const dia = somaDias(semProx, d);
                                  return (
                                    <button
                                      key={d}
                                      className={pill(escolha === dia)}
                                      onClick={() => {
                                        setReschedFeito(false);
                                        setResched((r) => ({ ...r, [t.id]: dia }));
                                      }}
                                    >
                                      {rotuloDia(semProx, d)}
                                    </button>
                                  );
                                })}
                                <button
                                  className={`pill-opt warm${escolha === "livre" ? " on" : ""}`}
                                  onClick={() => {
                                    setReschedFeito(false);
                                    setResched((r) => ({ ...r, [t.id]: "livre" }));
                                  }}
                                >
                                  outra data…
                                </button>
                              </div>
                              {escolha === "livre" && (
                                <input
                                  className="tri-input"
                                  style={{ margin: "-4px 0 10px" }}
                                  placeholder="ex.: 24/07, dia 24 ou próxima sexta"
                                  value={reschedLivre[t.id] ?? ""}
                                  onChange={(e) => setReschedLivre((r) => ({ ...r, [t.id]: e.target.value }))}
                                />
                              )}
                            </div>
                          );
                        })}
                        <span className="chip" style={{ cursor: "pointer" }} onClick={aplicarResched}>
                          {reschedFeito ? "Reagendamento confirmado ✓" : "Confirmar reagendamento →"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                </div>
                )}
                {passo === 4 && (
                <div className="wk-step-unico">
                {/* 5 · bloco de foco */}
                <div className="wk-step">
                  <span className="wk-num">5</span>
                  <div style={{ flex: 1 }}>
                    <b>Decisão · Proteger um bloco de foco</b>
                    <p>Espaços realmente livres na semana {numProx}, já descontando seus compromissos:</p>
                    <div className="pillrow" style={{ marginTop: 8 }}>
                      {vagas.map((v, i) => (
                        <button
                          key={i}
                          className={pill(focoSel === i)}
                          onClick={() => {
                            setFocoFeito(false);
                            setFocoSel(i);
                          }}
                        >
                          {rotuloDia(semProx, v.diaIdx)} · {fmtHora(v.ini)}–{fmtHora(v.fim)}
                        </button>
                      ))}
                      <button
                        className={`pill-opt warm${focoSel === "livre" ? " on" : ""}`}
                        onClick={() => {
                          setFocoFeito(false);
                          setFocoSel("livre");
                        }}
                      >
                        outro horário…
                      </button>
                    </div>
                    {focoSel === "livre" && (
                      <input
                        className="tri-input"
                        style={{ margin: "-4px 0 10px" }}
                        placeholder="ex.: seg 14h-16h"
                        value={focoLivre}
                        onChange={(e) => setFocoLivre(e.target.value)}
                      />
                    )}
                    <span className="chip" style={{ cursor: "pointer" }} onClick={aplicarFoco}>
                      {focoFeito ? "Bloco reservado ✓" : "Reservar bloco →"}
                    </span>
                  </div>
                </div>

                </div>
                )}
                {passo === 5 && (
                <div className="wk-step-unico">
                {/* 6 · projeto parado */}
                <div className="wk-step">
                  <span className="wk-num">6</span>
                  <div style={{ flex: 1 }}>
                    {parado ? (
                      <>
                        <b>
                          Decisão · &quot;{parado.c.emoji ? `${parado.c.emoji} ` : ""}
                          {parado.c.nome}&quot; parado há {parado.dias} dias
                        </b>
                        <p>Sem tarefa nova nem conclusão nesse período. Qual é o próximo passo, e para quando?</p>
                        <input className="tri-input" value={projTitulo} onChange={(e) => setProjTitulo(e.target.value)} />
                        <div className="pillrow" style={{ marginTop: 8 }}>
                          {[0, 1, 2].map((d) => (
                            <button
                              key={d}
                              className={pill(projDia === d)}
                              onClick={() => {
                                setProjFeito(false);
                                setProjDia(d);
                              }}
                            >
                              {rotuloDia(semProx, d)}
                            </button>
                          ))}
                        </div>
                        <span className="chip" style={{ cursor: "pointer" }} onClick={aplicarProj}>
                          {projFeito ? "Tarefa criada ✓" : "Criar tarefa →"}
                        </span>
                      </>
                    ) : (
                      <>
                        <b>Projetos em movimento</b>
                        <p>Nenhum projeto parado há mais de 10 dias 🎉</p>
                      </>
                    )}
                  </div>
                </div>

                </div>
                )}
                {passo === 6 && (
                <div className="wk-step-unico">
                {/* 7 · inbox */}
                <div className="wk-step">
                  <span className="wk-num">7</span>
                  <div>
                    <b>Inbox {inboxCount === 0 ? "em dia" : "com pendências"}</b>
                    <p>
                      {inboxCount === 0
                        ? "Nenhum item esperando triagem."
                        : `${inboxCount} item${inboxCount > 1 ? "s" : ""} esperando triagem — faça o check do dia depois da revisão.`}
                      {incubadas.total > 0 &&
                        ` ${incubadas.total} ideia${incubadas.total > 1 ? "s" : ""} incubada${incubadas.total > 1 ? "s" : ""}${incubadas.volta ? ` — a próxima volta em ${incubadas.volta.split("-").reverse().slice(0, 2).join("/")}` : ""}.`}
                    </p>
                  </div>
                </div>

                </div>
                )}

                <div className="wk-dots" aria-hidden>
                  {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
                    <button key={i} className={`wk-dot${i === passo ? " on" : ""}`} onClick={() => setPasso(i)} />
                  ))}
                </div>
                <div className="modal-foot">
                  <button className="btn ghost" style={{ marginRight: "auto" }} onClick={onClose}>
                    Depois
                  </button>
                  {passo > 0 && (
                    <button className="btn ghost" onClick={() => setPasso(passo - 1)}>
                      ← Voltar
                    </button>
                  )}
                  {passo < TOTAL_PASSOS - 1 ? (
                    <button className="btn primary" onClick={() => setPasso(passo + 1)}>
                      Avançar → <small style={{ fontWeight: 400, opacity: 0.85 }}>({passo + 1}/{TOTAL_PASSOS})</small>
                    </button>
                  ) : (
                    <button className="btn primary" onClick={concluir}>
                      Concluir revisão ✓
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
