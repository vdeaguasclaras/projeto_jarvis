"use client";

import { DAY_EVENTS, DAY_PRIORITIES } from "@/lib/demo";
import type { Evento, Tarefa } from "@/lib/db";
import TimeGrid, { arrasteToque, blocoDeEvento, blocoDeTarefa, hhmm, type Bloco, type DropInfo } from "@/components/TimeGrid";
import PrioRow, { type PrioItem } from "@/components/PrioRow";

type Props = {
  logged: boolean;
  hoje: string;
  inboxCount: number;
  placar: { done: number; total: number };
  seq: number;
  eventos: Evento[];
  tarefas: Tarefa[];
  prioridades: PrioItem[];
  onCheck: () => void;
  onToast: (msg: string) => void;
  onSlotClick: (dataISO: string, hora: number) => void;
  onDrop: (info: DropInfo, dataISO: string, hora: number) => void;
  onEventoClick: (id: string) => void;
  onConcluirTarefa: (id: string) => void;
  onDefinirPrio: () => void;
};

export default function DayView({
  logged,
  hoje,
  inboxCount,
  placar,
  seq,
  eventos,
  tarefas,
  prioridades,
  onCheck,
  onToast,
  onSlotClick,
  onDrop,
  onEventoClick,
  onConcluirTarefa,
  onDefinirPrio,
}: Props) {
  const pct = Math.min(100, Math.round((placar.done / Math.max(placar.total, 1)) * 100));

  // Demo (sem login) mantém a agenda de exemplo do protótipo
  const blocos: Bloco[] = logged
    ? [
        ...eventos.map(blocoDeEvento),
        ...tarefas.map(blocoDeTarefa).filter((b): b is Bloco => b !== null),
      ].filter((b) => b.dataISO === hoje)
    : DAY_EVENTS.map((ev) => ({
        id: ev.id,
        tipo: "evento" as const,
        titulo: ev.title,
        dataISO: hoje,
        inicio: ev.start,
        fim: ev.end,
        classe: ev.source === "task" ? ("task" as const) : (ev.source as "g" | "o"),
        durMin: (ev.end - ev.start) * 60,
      }));

  // Bandeja: o que é para hoje (ou venceu) e ainda não tem horário
  const semHorario = logged
    ? tarefas.filter(
        (t) =>
          (t.status === "a_fazer" || t.status === "em_andamento") &&
          !t.agendada_inicio &&
          t.prazo !== null &&
          t.prazo <= hoje,
      )
    : [];

  const clicarBloco = (b: Bloco) => {
    if (!logged) {
      onToast(`${b.titulo} — agenda de exemplo; entre para criar a sua`);
      return;
    }
    if (b.tipo === "evento") onEventoClick(b.id);
    else onToast(b.feita ? "Já concluída ✓" : `${b.titulo} · ${hhmm(b.inicio)} — duplo clique conclui, arraste para mudar o horário`);
  };

  return (
    <div className="view-in">
      <div className="daycheck stagger" style={{ ["--i" as string]: 0 }}>
        <div style={{ flex: 1 }}>
          <div className="ttl">◉ Check do dia</div>
          <div className="sub">
            {inboxCount > 0 ? (
              <>
                Sua Inbox tem <b>{inboxCount}</b> {inboxCount === 1 ? "item esperando" : "itens esperando"} triagem —
                etapa <b>Organizar</b> do CODE.
              </>
            ) : (
              <>Inbox zero — capture à vontade, a triagem organiza depois.</>
            )}
          </div>
          <div className="game-row">
            <div className="gamebar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <span className="game-lbl">
              Placar de hoje: <b>{placar.done} de {placar.total}</b>
              {" · 🔥 "}
              {seq > 1 ? (
                <>
                  <b>{seq} dias</b> de check em sequência
                </>
              ) : seq === 1 ? (
                <b>check de hoje feito</b>
              ) : (
                <>a sequência começa hoje</>
              )}
            </span>
          </div>
        </div>
        <button className="go" onClick={onCheck}>
          Fazer o check
        </button>
      </div>

      <PrioRow
        label="Prioridades de hoje"
        items={logged ? prioridades : DAY_PRIORITIES.map((p) => ({ titulo: p.label, feita: p.done }))}
        i={0.5}
        onDefinir={() => (logged ? onDefinirPrio() : onToast("Entre com seu e-mail para definir as suas"))}
      />

      {semHorario.length > 0 && (
        <div className="tray stagger" style={{ ["--i" as string]: 0.7 }}>
          <span className="plabel">Sem horário</span>
          {semHorario.map((t) => (
            <span
              key={t.id}
              className="traychip"
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ tipo: "tarefa", id: t.id, durMin: t.duracao_min ?? 60 } satisfies DropInfo),
                )
              }
              onPointerDown={(e) =>
                arrasteToque(e, { tipo: "tarefa", id: t.id, durMin: t.duracao_min ?? 60 }, t.titulo, logged ? onDrop : undefined)
              }
              onClick={() => onToast("Arraste para a grade para reservar um horário")}
            >
              {t.titulo}
            </span>
          ))}
          <span className="empty-hint" style={{ margin: 0 }}>← arraste para a grade</span>
        </div>
      )}

      <TimeGrid
        dias={[hoje]}
        hoje={hoje}
        blocos={blocos}
        onSlotClick={logged ? onSlotClick : (_, h) => onToast(`Entre para criar um evento às ${hhmm(h)}`)}
        onDrop={logged ? onDrop : undefined}
        onBlocoClick={clicarBloco}
        onBlocoDblClick={(b) => logged && b.tipo === "tarefa" && !b.feita && onConcluirTarefa(b.id)}
      />
    </div>
  );
}
