"use client";

import { useEffect, useMemo, useState } from "react";
import {
  checksEntre,
  criarEvento,
  criarNota,
  definirPrioridades,
  hojeISO,
  listEventos,
  mudarPrazoTarefa,
  placaresDeRevisoes,
  registrarRitual,
  segundaDe,
  sequenciaRevisoes,
  soltarPrazoTarefa,
  somaDias,
  type Container,
  type Evento,
  type Nota,
  type Tarefa,
} from "@/lib/db";
import { linksDe } from "@/lib/markdown";
import { isoDe } from "@/components/TimeGrid";

/** Revisão semanal — Etapa I do redesign (14a · 2c): o wizard dá lugar ao
 *  formato jornal. Epígrafe com a citação da semana; à esquerda "A semana
 *  que passou" (manchete, narrativa com números, barras por dia, "Ficou
 *  para trás", "Coluna do editor"); à direita "A semana que começa"
 *  (até 3 âncoras, "Semear na agenda" nos vãos livres, CTA).
 *  No celular (2c): bottom sheet quase cheio, os mesmos blocos em passos.
 *  Ao concluir: placar no kairos_rituais e tudo salvo como nota da semana. */

type Props = {
  userId: string;
  tarefas: Tarefa[];
  containers: Container[];
  notas: Nota[];
  inboxCount: number;
  onClose: () => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const DIAS_LONGOS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Citação da semana — lista curada, rotativa pelo número da semana (14a).
const CITACOES: { t: string; a: string; o: string }[] = [
  { t: "Concentra-te no que tens diante de ti.", a: "Marco Aurélio", o: "Meditações" },
  { t: "Não recebemos uma vida curta; nós a tornamos curta.", a: "Sêneca", o: "Sobre a Brevidade da Vida" },
  { t: "O real não está na saída nem na chegada: ele se dispõe para a gente é no meio da travessia.", a: "Guimarães Rosa", o: "Grande Sertão: Veredas" },
  { t: "Sê todo em cada coisa. Põe quanto és no mínimo que fazes.", a: "Ricardo Reis (Fernando Pessoa)", o: "Odes" },
  { t: "Enquanto adiamos, a vida passa.", a: "Sêneca", o: "Cartas a Lucílio" },
  { t: "Somos o que repetidamente fazemos.", a: "Will Durant, sobre Aristóteles", o: "A História da Filosofia" },
  { t: "Não são as coisas que nos perturbam, mas as opiniões que temos delas.", a: "Epicteto", o: "Encheirídion" },
  { t: "Uma jornada de mil milhas começa com um único passo.", a: "Lao Tsé", o: "Tao Te Ching" },
  { t: "Tenha paciência com tudo o que não está resolvido em seu coração.", a: "Rainer Maria Rilke", o: "Cartas a um Jovem Poeta" },
  { t: "Feliz aquele que transfere o que sabe e aprende o que ensina.", a: "Cora Coralina", o: "Exaltação de Aninha" },
];

function numeroSemanaISO(dataISO: string): number {
  const [a, m, d] = dataISO.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  const dow = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dow);
  const ano1 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - ano1.getTime()) / 86400000 + 1) / 7);
}

function rotuloDia(semanaISO: string, idx: number): string {
  return `${DIAS[idx]} ${Number(somaDias(semanaISO, idx).split("-")[2])}`;
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
    .map((v) => ({ ...v, fim: Math.min(v.fim, v.ini + 2) })); // âncora ganha um bloco de 2h
}

type Ancora = { tarefa_id: string | null; titulo: string };

export default function RevisaoJornal({ userId, tarefas, containers, notas, inboxCount, onClose, onChanged, onToast }: Props) {
  const hoje = hojeISO();
  const semAtual = segundaDe(hoje);
  const fimSemAtual = somaDias(semAtual, 6);
  const semProx = somaDias(semAtual, 7);
  const numAtual = numeroSemanaISO(semAtual);
  const numProx = numeroSemanaISO(semProx);
  const cit = CITACOES[numAtual % CITACOES.length];

  // ── dados que o jornal busca sozinho ──
  const [evProx, setEvProx] = useState<Evento[]>([]);
  const [checks, setChecks] = useState(0);
  const [mediaConcluidas, setMediaConcluidas] = useState<number | null>(null);
  const [seqRev, setSeqRev] = useState(0);
  const [pronto, setPronto] = useState(false);
  const [passo, setPasso] = useState(0); // só no celular (2c) — o desktop mostra tudo
  const TOTAL_PASSOS = 5;

  useEffect(() => {
    (async () => {
      const [ep, ch, pl, sr] = await Promise.all([
        listEventos(semProx, somaDias(semProx, 7)),
        checksEntre(semAtual, fimSemAtual),
        placaresDeRevisoes(8),
        sequenciaRevisoes(),
      ]);
      setEvProx(ep);
      setChecks(ch);
      const vals = pl.map((p) => Number(p.concluidas)).filter((n) => Number.isFinite(n));
      setMediaConcluidas(vals.length >= 2 ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
      setSeqRev(sr);
      setPronto(true);
    })();
    // âncoras temporais derivam de hojeISO() — estáveis durante a vida do jornal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── a semana que passou, em números ──
  const abertas = tarefas.filter((t) => t.status !== "concluida" && t.status !== "algum_dia");
  const concluidasSemana = tarefas.filter(
    (t) => t.status === "concluida" && (t.concluida_em ?? "").slice(0, 10) >= semAtual && (t.concluida_em ?? "").slice(0, 10) <= fimSemAtual,
  );
  const pendentesSemana = abertas.filter((t) => t.prazo !== null && t.prazo <= fimSemAtual);
  const totalSemana = concluidasSemana.length + pendentesSemana.length;
  const pct = totalSemana ? Math.round((concluidasSemana.length / totalSemana) * 100) : 100;
  const vencidas = abertas.filter((t) => t.prazo !== null && t.prazo < hoje).slice(0, 6);

  const porDia = useMemo(() => {
    const dias = Array.from({ length: 7 }, () => 0);
    for (const t of concluidasSemana) {
      const d = new Date(t.concluida_em!);
      dias[(d.getDay() + 6) % 7]++;
    }
    return dias;
  }, [concluidasSemana]);
  const melhorIdx = porDia.some((n) => n > 0) ? porDia.indexOf(Math.max(...porDia)) : -1;

  const notasNovas = useMemo(
    () => notas.filter((n) => n.criada_em.slice(0, 10) >= semAtual && n.criada_em.slice(0, 10) <= fimSemAtual),
    [notas, semAtual, fimSemAtual],
  );
  const conexoesNovas = useMemo(() => notasNovas.reduce((s, n) => s + linksDe(n.md).length, 0), [notasNovas]);

  const projetosAvancaram = useMemo(
    () => new Set(concluidasSemana.map((t) => t.container_id).filter((id): id is string => !!id)).size,
    [concluidasSemana],
  );

  // projeto que mais andou → vira manchete
  const destaque = useMemo(() => {
    const cont = new Map<string, number>();
    for (const t of concluidasSemana) if (t.container_id) cont.set(t.container_id, (cont.get(t.container_id) ?? 0) + 1);
    let melhor: { c: Container; n: number } | null = null;
    for (const [id, n] of cont) {
      const c = containers.find((x) => x.id === id && x.kind === "projeto");
      if (c && (!melhor || n > melhor.n)) melhor = { c, n };
    }
    return melhor && melhor.n >= 2 ? melhor : null;
  }, [concluidasSemana, containers]);

  const manchete =
    concluidasSemana.length === 0
      ? "Uma semana para recomeçar"
      : destaque
        ? `A semana em que ${destaque.c.nome} destravou`
        : pct >= 80
          ? "A semana em que quase nada escapou"
          : notasNovas.length >= 3
            ? "A semana em que as ideias viraram notas"
            : "Uma semana de passos constantes";

  const vsMedia =
    mediaConcluidas === null
      ? null
      : concluidasSemana.length - mediaConcluidas >= 1.5
        ? "acima da sua média"
        : mediaConcluidas - concluidasSemana.length >= 1.5
          ? "abaixo da sua média"
          : "na linha da sua média";

  // ── ficou para trás: reagendar / soltar, uma a uma ──
  const [tratadas, setTratadas] = useState<Record<string, string>>({}); // id → rótulo do que aconteceu
  const reagendar = async (t: Tarefa, i: number) => {
    const dia = somaDias(semProx, i % 4); // espalha entre seg–qui
    const err = await mudarPrazoTarefa(t.id, dia);
    if (err) return onToast(`Erro ao reagendar: ${err}`);
    setTratadas((r) => ({ ...r, [t.id]: `→ ${rotuloDia(semProx, i % 4)} ✓` }));
    onChanged();
  };
  const soltar = async (t: Tarefa) => {
    const err = await soltarPrazoTarefa(t.id);
    if (err) return onToast(`Erro ao soltar: ${err}`);
    setTratadas((r) => ({ ...r, [t.id]: "solta ✓" }));
    onChanged();
  };

  // ── coluna do editor ──
  const [reflexao, setReflexao] = useState("");

  // ── a semana que começa: âncoras ──
  const candidatas = useMemo(
    () =>
      tarefas
        .filter((t) => t.status === "a_fazer" || t.status === "em_andamento")
        .sort((a, b) => ((a.prazo ?? "9999") < (b.prazo ?? "9999") ? -1 : 1)),
    [tarefas],
  );
  const [ancoras, setAncoras] = useState<Ancora[]>([]);
  const [ancoraLivre, setAncoraLivre] = useState("");
  useEffect(() => {
    if (!pronto) return;
    // Kairós propõe: as 2 tarefas com prazo dentro da próxima semana (você decide a 3ª)
    setAncoras(
      candidatas
        .filter((t) => t.prazo !== null && t.prazo <= somaDias(semProx, 6))
        .slice(0, 2)
        .map((t) => ({ tarefa_id: t.id, titulo: t.titulo })),
    );
    // só na carga inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto]);

  const addAncora = (a: Ancora) => {
    if (ancoras.length >= 3) return onToast("Máximo de 3 âncoras — tire uma antes");
    if (a.tarefa_id && ancoras.some((x) => x.tarefa_id === a.tarefa_id)) return;
    setAncoras((prev) => [...prev, a]);
  };

  const metaAncora = (a: Ancora) => {
    if (!a.tarefa_id) return "✎ avulsa";
    const t = tarefas.find((x) => x.id === a.tarefa_id);
    const c = t?.container_id ? containers.find((x) => x.id === t.container_id) : null;
    return c ? `▶ ${c.emoji ? c.emoji + " " : ""}${c.nome}` : "▶ tarefa";
  };

  // ── semear na agenda: âncora i ↔ vaga i (heurística de vãos livres) ──
  const vagas = useMemo(() => vagasDeFoco(semProx, evProx), [semProx, evProx]);
  const [semeadas, setSemeadas] = useState<Set<number>>(new Set());
  useEffect(() => {
    // proposta inicial: semeia tudo o que tem vaga (o usuário tira com um toque)
    setSemeadas(new Set(ancoras.map((_, i) => i).filter((i) => i < vagas.length)));
  }, [ancoras, vagas]);

  // ── concluir: prioridades + eventos + nota da semana + placar ──
  const [salvando, setSalvando] = useState(false);
  const concluir = async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      const errPrio = await definirPrioridades(
        userId,
        "semana",
        semProx,
        ancoras.map((a) => (a.tarefa_id ? { tarefa_id: a.tarefa_id } : { titulo: a.titulo })),
      );
      if (errPrio) return onToast(`Erro ao salvar as âncoras: ${errPrio}`);

      for (const i of semeadas) {
        const a = ancoras[i];
        const v = vagas[i];
        if (!a || !v) continue;
        const dataISO = somaDias(semProx, v.diaIdx);
        const err = await criarEvento(userId, {
          titulo: `⚓ ${a.titulo}`,
          inicio: isoDe(dataISO, v.ini),
          fim: isoDe(dataISO, v.fim),
        });
        if (err) return onToast(`Erro ao semear na agenda: ${err}`);
      }

      const md = [
        `> ${cit.t} — ${cit.a}, *${cit.o}*`,
        "",
        "## A semana que passou",
        `**${manchete}.** ${concluidasSemana.length} tarefa${concluidasSemana.length === 1 ? "" : "s"} concluída${concluidasSemana.length === 1 ? "" : "s"} (${pct}% do previsto), Despacho em ${checks} de 7 dias, ${notasNovas.length} nota${notasNovas.length === 1 ? "" : "s"} nova${notasNovas.length === 1 ? "" : "s"} e ${conexoesNovas} conex${conexoesNovas === 1 ? "ão" : "ões"}.${melhorIdx >= 0 ? ` Melhor dia: ${DIAS_LONGOS[melhorIdx]}.` : ""}`,
        "",
        ...(reflexao.trim() ? ["## Coluna do editor", reflexao.trim(), ""] : []),
        "## A semana que começa",
        ...(ancoras.length ? ancoras.map((a, i) => `${i + 1}. ${a.tarefa_id ? `[[${a.titulo}]]` : a.titulo}`) : ["(sem âncoras definidas)"]),
      ].join("\n");
      const { err: errNota } = await criarNota(userId, `Jornal da semana ${numAtual}`, md);
      if (errNota) return onToast(`Erro ao salvar a nota da semana: ${errNota}`);

      await registrarRitual(userId, "revisao_semana", {
        semana: numAtual,
        manchete,
        concluidas: concluidasSemana.length,
        total: totalSemana,
        pct,
        checks,
        notas_novas: notasNovas.length,
        conexoes: conexoesNovas,
        melhor_dia: melhorIdx >= 0 ? DIAS[melhorIdx] : null,
        vencidas_tratadas: Object.keys(tratadas).length,
        ancoras: ancoras.map((a) => a.titulo),
      });
      onChanged();
      const seq = seqRev + 1;
      onToast(`Semana ${numProx} começada ✓ — jornal salvo como nota 🔥 ${seq} revis${seq > 1 ? "ões" : "ão"} seguida${seq > 1 ? "s" : ""}`);
      onClose();
    } finally {
      setSalvando(false);
    }
  };

  const [aH, mH, dH] = hoje.split("-").map(Number);
  const hojeIdx = (new Date(aH, mH - 1, dH).getDay() + 6) % 7;
  const alturaBarra = (n: number) => {
    const max = Math.max(...porDia, 1);
    return n === 0 ? 10 : 14 + Math.round((n / max) * 42);
  };

  const narrativa = (
    <p className="rvj-narrativa">
      {concluidasSemana.length === 0 ? (
        <>Nenhuma tarefa concluída nesta semana — às vezes o descanso também é trabalho. </>
      ) : (
        <>
          Foram <b>{concluidasSemana.length} tarefa{concluidasSemana.length === 1 ? "" : "s"} concluída{concluidasSemana.length === 1 ? "" : "s"}</b>
          {vsMedia ? <> — {vsMedia}</> : null}. </>
      )}
      O Despacho fechou em <b>{checks} de 7 dias</b>.{" "}
      {melhorIdx >= 0 && (
        <>
          A {DIAS_LONGOS[melhorIdx]} foi o seu melhor dia, com <b>{porDia[melhorIdx]} conclus{porDia[melhorIdx] === 1 ? "ão" : "ões"}</b>.{" "}
        </>
      )}
      {vencidas.length > 0 ? (
        <>
          Nem tudo andou: <b>{vencidas.length} tarefa{vencidas.length === 1 ? "" : "s"}</b> atravess{vencidas.length === 1 ? "ou" : "aram"} a semana intocada{vencidas.length === 1 ? "" : "s"}.{" "}
        </>
      ) : (
        <>Nada ficou vencido para trás. </>
      )}
      {notasNovas.length > 0 && (
        <>
          Suas notas renderam <b>{notasNovas.length} nova{notasNovas.length === 1 ? "" : "s"}</b>
          {conexoesNovas > 0 ? <> e <b>{conexoesNovas} conex{conexoesNovas === 1 ? "ão" : "ões"}</b></> : null}.
        </>
      )}
    </p>
  );

  const sugestoesAncora = candidatas.filter((t) => !ancoras.some((a) => a.tarefa_id === t.id)).slice(0, 5);

  return (
    <>
      <div className="desp-scrim" onClick={onClose} />
      <div className="rvj" data-passo={passo} role="dialog" aria-label="Revisão semanal">
        {!pronto ? (
          <p className="rvj-carregando">Imprimindo a edição da semana…</p>
        ) : (
          <>
            <header className="rvj-epigrafe rvj-passo p0">
              <div className="rvj-kicker">
                Revisão semanal · edição nº {numAtual} · {DIAS_LONGOS[hojeIdx]}, {dH} de {MESES[mH - 1]}
              </div>
              <blockquote>“{cit.t}”</blockquote>
              <div className="rvj-fonte">
                {cit.a}, {cit.o} · citação da semana
              </div>
            </header>

            <div className="rvj-cols">
              {/* ── esquerda · a semana que passou ── */}
              <section className="rvj-col">
                <div className="rvj-bloco rvj-passo p0">
                  <div className="rvj-secao">A semana que passou</div>
                  <h2 className="rvj-manchete">{manchete}</h2>
                  {/* tiles 2×2 do 2c — só no celular; no desktop a narrativa basta */}
                  <div className="rvj-tiles">
                    <div className="verde"><b>{concluidasSemana.length}</b><span>tarefa{concluidasSemana.length === 1 ? "" : "s"} concluída{concluidasSemana.length === 1 ? "" : "s"}</span></div>
                    <div className="quente"><b>{checks}<i>/7</i></b><span>dias com Despacho</span></div>
                    <div className="lilas"><b>{notasNovas.length}</b><span>nota{notasNovas.length === 1 ? "" : "s"} nova{notasNovas.length === 1 ? "" : "s"}</span></div>
                    <div><b>{projetosAvancaram}</b><span>projeto{projetosAvancaram === 1 ? " avançou" : "s avançaram"}</span></div>
                  </div>
                  {narrativa}
                </div>

                <div className="rvj-bloco rvj-passo p1">
                  <div className="rvj-barras" aria-label="Conclusões por dia">
                    {porDia.map((n, i) => (
                      <div key={i} className="rvj-barra">
                        <i
                          className={i === melhorIdx ? "melhor" : n === 0 ? "vazia" : ""}
                          style={{ height: alturaBarra(n) }}
                          title={`${n} conclus${n === 1 ? "ão" : "ões"}`}
                        />
                        <span className={i === melhorIdx ? "melhor" : ""}>
                          {DIAS[i]}
                          {i === melhorIdx ? " ★" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="rvj-tras">
                    <div className="rvj-plabel">Ficou para trás</div>
                    {vencidas.length === 0 ? (
                      <p className="rvj-vazio">Nada — semana limpa ✓</p>
                    ) : (
                      vencidas.map((t, i) => (
                        <div key={t.id} className="rvj-tras-item">
                          <span className="titulo">{t.titulo}</span>
                          {tratadas[t.id] ? (
                            <span className="feito">{tratadas[t.id]}</span>
                          ) : (
                            <>
                              <button className="ok" onClick={() => reagendar(t, i)}>reagendar</button>
                              <button onClick={() => soltar(t)}>soltar</button>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rvj-bloco rvj-editor-bloco rvj-passo p2">
                  <div className="rvj-plabel">
                    Coluna do editor <em>— você</em>
                  </div>
                  <textarea
                    className="rvj-editor"
                    placeholder="Como foi a semana, na sua voz? Vira o fecho da nota da semana."
                    value={reflexao}
                    onChange={(e) => setReflexao(e.target.value)}
                  />
                </div>
              </section>

              {/* ── direita · a semana que começa ── */}
              <section className="rvj-col">
                <div className="rvj-bloco rvj-passo p3">
                  <div className="rvj-secao verde">A semana que começa</div>
                  <h2 className="rvj-manchete">Na próxima edição…</h2>
                  <p className="rvj-sub">
                    Escolha até 3 âncoras — o que precisa ser verdade na sexta para a semana {numProx} ter valido.
                  </p>
                  {ancoras.map((a, i) => (
                    <div key={i} className="rvj-ancora">
                      <span className="num">{i + 1}</span>
                      <span className="titulo">{a.titulo}</span>
                      <span className="meta">{metaAncora(a)}</span>
                      <button className="tirar" title="Tirar âncora" onClick={() => setAncoras((prev) => prev.filter((_, j) => j !== i))}>
                        ✕
                      </button>
                    </div>
                  ))}
                  {ancoras.length < 3 && (
                    <div className="rvj-ancora vazia">
                      <span className="num">{ancoras.length + 1}</span>
                      <input
                        value={ancoraLivre}
                        placeholder="escreva uma âncora e ⏎…"
                        onChange={(e) => setAncoraLivre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && ancoraLivre.trim()) {
                            addAncora({ tarefa_id: null, titulo: ancoraLivre.trim() });
                            setAncoraLivre("");
                          }
                        }}
                      />
                    </div>
                  )}
                  {ancoras.length < 3 && sugestoesAncora.length > 0 && (
                    <div className="pillrow rvj-sugestoes">
                      {sugestoesAncora.map((t) => (
                        <button key={t.id} className="pill-opt" onClick={() => addAncora({ tarefa_id: t.id, titulo: t.titulo })}>
                          {containers.find((c) => c.id === t.container_id)?.emoji ?? "+"} {t.titulo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rvj-bloco rvj-passo p4">
                  <div className="rvj-plabel">Semear na agenda</div>
                  <div className="rvj-semana">
                    {[0, 1, 2, 3, 4].map((d) => {
                      const daqui = [...semeadas].filter((i) => vagas[i]?.diaIdx === d && ancoras[i]);
                      const livre = vagas.find((v, i) => v.diaIdx === d && !semeadas.has(i) && i < ancoras.length);
                      return (
                        <div key={d} className="rvj-diacol">
                          <span>{rotuloDia(semProx, d)}</span>
                          {daqui.map((i) => (
                            <button
                              key={i}
                              className="chip-semeada"
                              title={`${ancoras[i].titulo} · ${fmtHora(vagas[i].ini)}–${fmtHora(vagas[i].fim)} — toque para tirar`}
                              onClick={() => setSemeadas((prev) => { const s = new Set(prev); s.delete(i); return s; })}
                            >
                              ⚓ {i + 1} · {fmtHora(vagas[i].ini)}
                            </button>
                          ))}
                          {livre && (
                            <button
                              className="chip-vaga"
                              title="Semear a âncora de volta nesse vão livre"
                              onClick={() => {
                                const i = vagas.findIndex((v, j) => v.diaIdx === d && !semeadas.has(j) && j < ancoras.length);
                                if (i >= 0) setSemeadas((prev) => new Set(prev).add(i));
                              }}
                            >
                              {fmtHora(livre.ini)} ★
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="rvj-dica">
                    {vagas.length === 0
                      ? "💡 A semana está tomada — nenhum vão livre de 2h entre 9h e 18h. As âncoras ficam sem hora marcada."
                      : ancoras.length === 0
                        ? "💡 Defina âncoras acima e eu proponho os melhores vãos livres da agenda para elas."
                        : `💡 Os maiores vãos livres da semana ${numProx}: ${vagas
                            .slice(0, ancoras.length)
                            .map((v) => `${DIAS[v.diaIdx]} ${fmtHora(v.ini)}–${fmtHora(v.fim)}`)
                            .join(", ")} — semeadas as âncoras; toque numa para tirar.`}
                  </div>
                  {inboxCount > 0 && (
                    <div className="rvj-dica">
                      📥 {inboxCount} item{inboxCount > 1 ? "s" : ""} na Inbox — faça o Despacho depois de começar a semana.
                    </div>
                  )}
                  <div className="rvj-cta">
                    <span>salva tudo como nota da semana ✎</span>
                    <button className="btn primary" disabled={salvando} onClick={concluir}>
                      {salvando ? "Salvando…" : "Começar a semana ✓"}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* ── rodapé do celular (2c): progresso em segmentos + navegação ── */}
            <footer className="rvj-mfoot">
              <div className="rvj-segs" aria-hidden>
                {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
                  <i key={i} className={i <= passo ? "on" : ""} />
                ))}
              </div>
              {passo > 0 && (
                <button className="btn ghost" onClick={() => setPasso(passo - 1)}>
                  ←
                </button>
              )}
              {passo < TOTAL_PASSOS - 1 ? (
                <button className="btn primary" onClick={() => setPasso(passo + 1)}>
                  Continuar →
                </button>
              ) : (
                <button className="btn primary" disabled={salvando} onClick={concluir}>
                  {salvando ? "Salvando…" : "Começar a semana ✓"}
                </button>
              )}
            </footer>
            <button className="rvj-depois" onClick={onClose}>
              Depois
            </button>
          </>
        )}
      </div>
    </>
  );
}
