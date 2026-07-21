"use client";

import { useEffect, useMemo, useState } from "react";
import { DAY_EVENTS, DAY_PRIORITIES } from "@/lib/demo";
import { cobreDia, somaDias, type Evento, type Pessoa, type Tarefa } from "@/lib/db";
import { corDoContainer } from "@/lib/cores";
import TimeGrid, { arrasteToque, blocoDeEvento, blocoDeTarefa, hhmm, type Bloco, type DropInfo } from "@/components/TimeGrid";
import type { PrioItem } from "@/components/PrioRow";

/** Hoje (redesign 10a desktop · 2a mobile): hero "Agora" time-aware +
 *  timeline do dia à esquerda; Despacho, Tarefas do dia (★ = prioridades)
 *  e Em espera/Amanhã à direita. No celular, tudo empilha e um seletor
 *  de 7 dias substitui a navegação do header. */

const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type Props = {
  logged: boolean;
  dia: string;
  hoje: string;
  inboxCount: number;
  seq: number;
  eventos: Evento[];
  tarefas: Tarefa[];
  pessoas: Pessoa[];
  prioridades: PrioItem[];
  onNavDia: (novoDia: string) => void;
  onCheck: () => void;
  onToast: (msg: string) => void;
  onSlotClick: (dataISO: string, hora: number) => void;
  onDrop: (info: DropInfo, dataISO: string, hora: number) => void;
  onEventoClick: (id: string) => void;
  onConcluirTarefa: (id: string) => void;
  onEditTarefa: (t: Tarefa) => void;
  onNovaTarefaDia: (titulo: string, dia: string) => void;
  onDefinirPrio: () => void;
  onPrioAbrir: (p: PrioItem) => void;
  onPrioConcluir: (p: PrioItem) => void;
};

/** relógio que acorda a cada minuto — o hero "Agora" é time-aware.
 *  Começa null (igual no prerender e na 1ª pintura do cliente) para não
 *  divergir na hidratação; o hero só aparece depois de montar. */
function useAgora(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function ddmm(iso: string): string {
  return iso.split("-").reverse().slice(0, 2).join("/");
}

export default function DayView(p: Props) {
  const now = useAgora();
  const vendoHoje = p.dia === p.hoje;

  // ── Blocos da timeline, com a cor do container (paleta estável por id) ──
  const diaInteiro = p.logged ? p.eventos.filter((e) => cobreDia(e, p.dia)) : [];
  const blocos: Bloco[] = p.logged
    ? [
        ...p.eventos.filter((e) => !e.dia_inteiro).map((e) => ({ ...blocoDeEvento(e), cor: corDoContainer(e.container_id) ?? undefined })),
        ...p.tarefas.map(blocoDeTarefa).filter((b): b is Bloco => b !== null),
      ].filter((b) => b.dataISO === p.dia)
    : DAY_EVENTS.map((ev) => ({
        id: ev.id,
        tipo: "evento" as const,
        titulo: ev.title,
        dataISO: p.dia,
        inicio: ev.start,
        fim: ev.end,
        classe: ev.source === "task" ? ("task" as const) : (ev.source as "g" | "o"),
        durMin: (ev.end - ev.start) * 60,
      }));

  // ── Hero "Agora": o compromisso corrente; sem corrente, o próximo de hoje ──
  const horaAgora = now ? now.getHours() + now.getMinutes() / 60 : -1;
  const hero = useMemo(() => {
    if (!vendoHoje || horaAgora < 0) return null;
    const eventosHoje = blocos.filter((b) => b.tipo === "evento").sort((a, b) => a.inicio - b.inicio);
    const corrente = eventosHoje.find((b) => b.inicio <= horaAgora && horaAgora < b.fim);
    if (corrente) {
      const restam = Math.max(1, Math.round((corrente.fim - horaAgora) * 60));
      const pct = Math.min(100, Math.round(((horaAgora - corrente.inicio) / (corrente.fim - corrente.inicio)) * 100));
      return { tipo: "agora" as const, b: corrente, restam, pct };
    }
    const proximo = eventosHoje.find((b) => b.inicio > horaAgora);
    if (proximo) {
      const falta = Math.round((proximo.inicio - horaAgora) * 60);
      return { tipo: "aseguir" as const, b: proximo, falta };
    }
    return null;
  }, [vendoHoje, blocos, horaAgora]);

  // ── Tarefas do dia: prazo até o dia visto (+ prioridades avulsas com ★) ──
  const doDia = p.logged
    ? p.tarefas.filter(
        (t) =>
          t.status !== "algum_dia" &&
          ((t.status !== "concluida" && t.prazo !== null && (vendoHoje ? t.prazo <= p.hoje : t.prazo === p.dia)) ||
            (t.status === "concluida" && (t.concluida_em ?? "").slice(0, 10) === p.dia)),
      )
    : [];
  const priorizadaIds = new Set(p.prioridades.filter((x) => x.tarefaId).map((x) => x.tarefaId));
  const avulsas = p.logged
    ? p.prioridades.filter((x) => !x.tarefaId)
    : DAY_PRIORITIES.map((d, i) => ({ id: String(i), tarefaId: null, titulo: d.label, feita: d.done, durMin: 30, agendada: false }));
  const abertas = [
    ...doDia.filter((t) => t.status !== "concluida" && priorizadaIds.has(t.id)),
    ...doDia.filter((t) => t.status !== "concluida" && !priorizadaIds.has(t.id)),
  ];
  const feitas = doDia.filter((t) => t.status === "concluida");
  const totalDia = abertas.length + feitas.length + avulsas.length;
  const feitasTotal = feitas.length + avulsas.filter((a) => a.feita).length;

  // ── Em espera (delegadas, com data de cobrança) e Amanhã ──
  const emEspera = p.logged ? p.tarefas.filter((t) => t.status === "em_espera").slice(0, 3) : [];
  const amanha = p.logged
    ? p.tarefas.filter((t) => t.status !== "concluida" && t.status !== "algum_dia" && t.prazo === somaDias(p.dia, 1)).slice(0, 3)
    : [];

  // seletor de 7 dias (mobile): a semana do dia visto, domingo a sábado
  const dias7 = useMemo(() => {
    const [a, m, d] = p.dia.split("-").map(Number);
    const dom = somaDias(p.dia, -new Date(a, m - 1, d).getDay());
    return Array.from({ length: 7 }, (_, i) => somaDias(dom, i));
  }, [p.dia]);
  const diaSemanaDe = (iso: string) => {
    const [a, m, d] = iso.split("-").map(Number);
    return DIAS_CURTOS[new Date(a, m - 1, d).getDay()];
  };
  const nomeDe = (id: string | null) => p.pessoas.find((x) => x.id === id)?.nome ?? null;

  const clicarBloco = (b: Bloco) => {
    if (!p.logged) {
      p.onToast(`${b.titulo} — agenda de exemplo; entre para criar a sua`);
      return;
    }
    if (b.tipo === "evento") {
      p.onEventoClick(b.id);
      return;
    }
    const t = p.tarefas.find((x) => x.id === b.id);
    if (t) p.onEditTarefa(t);
  };

  const linhaTarefa = (t: Tarefa) => (
    <div
      key={t.id}
      className="tdd-item"
      draggable
      onDragStart={(e) =>
        e.dataTransfer.setData("application/json", JSON.stringify({ tipo: "tarefa", id: t.id, durMin: t.duracao_min ?? 30 } satisfies DropInfo))
      }
      onPointerDown={(e) => arrasteToque(e, { tipo: "tarefa", id: t.id, durMin: t.duracao_min ?? 30 }, t.titulo, p.onDrop)}
    >
      <button
        className={`tdd-box${t.status === "concluida" ? " on" : ""}`}
        role="checkbox"
        aria-checked={t.status === "concluida"}
        title={t.status === "concluida" ? "Concluída" : "Concluir"}
        onClick={() => t.status !== "concluida" && p.onConcluirTarefa(t.id)}
      >
        {t.status === "concluida" ? "✓" : ""}
      </button>
      <button className={`tdd-txt${t.status === "concluida" ? " done" : ""}`} title="Abrir a tarefa" onClick={() => p.onEditTarefa(t)}>
        {t.titulo}
        {t.status !== "concluida" && vendoHoje && t.prazo && t.prazo < p.hoje && <span className="tdd-venceu">venceu {ddmm(t.prazo)}</span>}
      </button>
      {t.agendada_inicio && <span className="tdd-meta">{hhmm(new Date(t.agendada_inicio).getHours() + new Date(t.agendada_inicio).getMinutes() / 60)}</span>}
      {priorizadaIds.has(t.id) && t.status !== "concluida" && <span className="tdd-star">★</span>}
    </div>
  );

  return (
    <div className="view-in">
      {/* seletor de 7 dias — só no celular (2a) */}
      <div className="dias7 stagger" style={{ ["--i" as string]: 0 }}>
        {dias7.map((d) => (
          <button
            key={d}
            className={`dia7${d === p.dia ? " sel" : ""}${d === p.hoje ? " today" : ""}`}
            onClick={() => (p.logged ? p.onNavDia(d) : p.onToast("Entre para navegar pelos seus dias"))}
          >
            <small>{diaSemanaDe(d)}</small>
            <b>{Number(d.slice(8))}</b>
          </button>
        ))}
      </div>

      <div className="hoje-grid stagger" style={{ ["--i" as string]: 0.3 }}>
        <div className="hoje-esq">
          {hero && (
            <div className={`hero-agora${hero.tipo === "aseguir" ? " aseguir" : ""}`}>
              <div className="hero-info">
                <div className="hero-lbl">
                  {hero.tipo === "agora" ? `Agora · termina em ${hero.restam} min` : `A seguir · em ${hero.falta >= 60 ? `${Math.floor(hero.falta / 60)}h${String(hero.falta % 60).padStart(2, "0")}` : `${hero.falta} min`}`}
                </div>
                <div className="hero-titulo">
                  {hero.b.titulo}
                  <span> · {hhmm(hero.b.inicio)} – {hhmm(hero.b.fim)}</span>
                </div>
                {hero.tipo === "agora" && (
                  <div className="hero-prog">
                    <i style={{ width: `${hero.pct}%` }} />
                  </div>
                )}
              </div>
              {p.logged && hero.b.tipo === "evento" && (
                <button className="hero-nota" onClick={() => p.onEventoClick(hero.b.id)}>
                  Nota do evento ✎
                </button>
              )}
            </div>
          )}

          {diaInteiro.length > 0 && (
            <div className="allday">
              <span className="plabel">O dia todo</span>
              {diaInteiro.map((e) => (
                <button key={e.id} className={`allday-chip${e.origem === "google" ? " g" : ""}`} onClick={() => p.onEventoClick(e.id)}>
                  {e.titulo}
                </button>
              ))}
            </div>
          )}

          <div className="hoje-timeline">
            <TimeGrid
              dias={[p.dia]}
              hoje={p.hoje}
              blocos={blocos}
              onSlotClick={p.logged ? p.onSlotClick : (_, h) => p.onToast(`Entre para criar um evento às ${hhmm(h)}`)}
              onDrop={p.logged ? p.onDrop : undefined}
              onBlocoClick={clicarBloco}
              onBlocoDblClick={(b) => p.logged && b.tipo === "tarefa" && !b.feita && p.onConcluirTarefa(b.id)}
            />
          </div>
        </div>

        <div className="hoje-dir">
          {/* card quente do Despacho — o único lugar dele (10a) */}
          {vendoHoje && (
            <div className="card-despacho">
              <div className="cd-linha">
                <span className="cd-dot" />
                <span className="cd-titulo">
                  <b>Despacho</b>
                  {p.inboxCount > 0 ? ` · ${p.inboxCount} ${p.inboxCount === 1 ? "item" : "itens"}` : " · Inbox zero"}
                </span>
                <button className="cd-btn" onClick={p.onCheck}>
                  {p.inboxCount > 0 ? "Fazer agora" : "Revisar o dia"}
                </button>
              </div>
              <div className="cd-sub">
                {p.inboxCount > 0 ? `O único lugar dele. Zere e a sequência vai a ${p.seq + 1}.` : `🔥 ${p.seq > 1 ? `${p.seq} dias de sequência` : p.seq === 1 ? "feito hoje" : "a sequência começa hoje"}`}
                {" · atalho "}
                <kbd>D</kbd>
              </div>
            </div>
          )}

          <div className="card tdd">
            <div className="tdd-head">
              <span className="plabel">{vendoHoje ? "Tarefas do dia" : `Tarefas de ${ddmm(p.dia)}`}</span>
              <span className="tdd-count">
                {feitasTotal} de {totalDia}
              </span>
            </div>
            <div className="tdd-lista">
              {avulsas.map((a) => (
                <div key={a.id} className="tdd-item">
                  <button
                    className={`tdd-box${a.feita ? " on" : ""}`}
                    role="checkbox"
                    aria-checked={a.feita}
                    onClick={() => (p.logged ? p.onPrioConcluir(a) : p.onToast("Exemplo — entre para usar as suas"))}
                  >
                    {a.feita ? "✓" : ""}
                  </button>
                  <button className={`tdd-txt${a.feita ? " done" : ""}`} onClick={() => (p.logged ? p.onPrioAbrir(a) : p.onToast("Exemplo — entre para usar as suas"))}>
                    {a.titulo}
                  </button>
                  {!a.feita && <span className="tdd-star">★</span>}
                </div>
              ))}
              {abertas.map(linhaTarefa)}
              {feitas.map(linhaTarefa)}
              {totalDia === 0 && <p className="empty-hint">nada para este dia — capture ou arraste da agenda</p>}
            </div>
            <input
              className="note-search tdd-add"
              placeholder="+ tarefa p/ este dia…"
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && v) {
                  if (!p.logged) {
                    p.onToast("Entre para criar as suas tarefas");
                    return;
                  }
                  p.onNovaTarefaDia(v, p.dia);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
            <div className="tdd-foot">
              <span className="empty-hint">arraste para a agenda para dar hora</span>
              <button className="tdd-ajustar" onClick={() => (p.logged ? p.onDefinirPrio() : p.onToast("Entre para definir as suas ★"))}>
                Ajustar ★ →
              </button>
            </div>
          </div>

          {(emEspera.length > 0 || amanha.length > 0) && (
            <div className="card espera-card">
              {emEspera.map((t) => (
                <button key={t.id} className="esp-linha" onClick={() => p.onEditTarefa(t)}>
                  <span className="esp-ava">{(nomeDe(t.responsavel_id) ?? "?").slice(0, 1).toUpperCase()}</span>
                  <span className="esp-txt">
                    Em espera · {t.titulo}
                    {nomeDe(t.responsavel_id) && <small> @{nomeDe(t.responsavel_id)}</small>}
                  </span>
                  {t.prazo && <span className="esp-cobra">cobrar {t.prazo === somaDias(p.hoje, 1) ? "amanhã" : ddmm(t.prazo)}</span>}
                </button>
              ))}
              {amanha.map((t) => (
                <button key={t.id} className="esp-linha" onClick={() => p.onEditTarefa(t)}>
                  <span className="esp-ava am">→</span>
                  <span className="esp-txt">Amanhã · {t.titulo}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
