"use client";

import { DAY_EVENTS, DAY_PRIORITIES } from "@/lib/demo";
import { cobreDia, somaDias, type Evento, type Tarefa } from "@/lib/db";
import TimeGrid, { arrasteToque, blocoDeEvento, blocoDeTarefa, hhmm, type Bloco, type DropInfo } from "@/components/TimeGrid";
import PrioRow, { type PrioItem } from "@/components/PrioRow";

const DIAS_LONGOS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function rotuloDia(dia: string, hoje: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  const nome = `${DIAS_LONGOS[dt.getDay()]}, ${d} de ${MESES[m - 1]}`;
  if (dia === hoje) return nome;
  if (dia === somaDias(hoje, 1)) return `amanhã · ${nome}`;
  if (dia === somaDias(hoje, -1)) return `ontem · ${nome}`;
  return nome;
}

type Props = {
  logged: boolean;
  /** dia sendo visto — o padrão é hoje, mas dá para navegar (pedido do Raul) */
  dia: string;
  hoje: string;
  inboxCount: number;
  placar: { done: number; total: number };
  seq: number;
  eventos: Evento[];
  tarefas: Tarefa[];
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

export default function DayView({
  logged,
  dia,
  hoje,
  inboxCount,
  placar,
  seq,
  eventos,
  tarefas,
  prioridades,
  onNavDia,
  onCheck,
  onToast,
  onSlotClick,
  onDrop,
  onEventoClick,
  onConcluirTarefa,
  onEditTarefa,
  onNovaTarefaDia,
  onDefinirPrio,
  onPrioAbrir,
  onPrioConcluir,
}: Props) {
  const pct = Math.min(100, Math.round((placar.done / Math.max(placar.total, 1)) * 100));
  const vendoHoje = dia === hoje;

  // Eventos de dia inteiro ficam na faixa própria, fora da grade de horas
  const diaInteiro = logged ? eventos.filter((e) => cobreDia(e, dia)) : [];

  // Demo (sem login) mantém a agenda de exemplo do protótipo
  const blocos: Bloco[] = logged
    ? [
        ...eventos.filter((e) => !e.dia_inteiro).map(blocoDeEvento),
        ...tarefas.map(blocoDeTarefa).filter((b): b is Bloco => b !== null),
      ].filter((b) => b.dataISO === dia)
    : DAY_EVENTS.map((ev) => ({
        id: ev.id,
        tipo: "evento" as const,
        titulo: ev.title,
        dataISO: dia,
        inicio: ev.start,
        fim: ev.end,
        classe: ev.source === "task" ? ("task" as const) : (ev.source as "g" | "o"),
        durMin: (ev.end - ev.start) * 60,
      }));

  // Coluna do dia: tarefas deste dia (vendo hoje, as vencidas também) sem horário —
  // "ligar para alguém" não precisa de hora marcada, mas precisa aparecer no dia.
  const semHorario = logged
    ? tarefas.filter(
        (t) =>
          (t.status === "a_fazer" || t.status === "em_andamento") &&
          !t.agendada_inicio &&
          t.prazo !== null &&
          (vendoHoje ? t.prazo <= hoje : t.prazo === dia),
      )
    : [];

  const clicarBloco = (b: Bloco) => {
    if (!logged) {
      onToast(`${b.titulo} — agenda de exemplo; entre para criar a sua`);
      return;
    }
    if (b.tipo === "evento") {
      onEventoClick(b.id);
      return;
    }
    const t = tarefas.find((x) => x.id === b.id);
    if (t) onEditTarefa(t);
  };

  return (
    <div className="view-in">
      <div className="weeknav stagger" style={{ ["--i" as string]: 0 }}>
        <button onClick={() => (logged ? onNavDia(somaDias(dia, -1)) : onToast("Entre para navegar pelos seus dias"))} aria-label="Dia anterior">
          ‹
        </button>
        <button onClick={() => onNavDia(hoje)} className={vendoHoje ? "on" : ""}>
          hoje
        </button>
        <button onClick={() => (logged ? onNavDia(somaDias(dia, 1)) : onToast("Entre para navegar pelos seus dias"))} aria-label="Próximo dia">
          ›
        </button>
        <input
          className="weeknav-date"
          type="date"
          value={dia}
          onChange={(e) => e.target.value && onNavDia(e.target.value)}
          aria-label="Ir para o dia"
        />
        <span className="range">{rotuloDia(dia, hoje)}</span>
      </div>

      {vendoHoje && (
        <div className="daycheck stagger" style={{ ["--i" as string]: 0.3 }}>
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
      )}

      <PrioRow
        label={vendoHoje ? "Prioridades de hoje" : "Prioridades do dia"}
        items={
          logged
            ? prioridades
            : DAY_PRIORITIES.map((p, i) => ({ id: String(i), tarefaId: null, titulo: p.label, feita: p.done, durMin: 30, agendada: false }))
        }
        i={0.5}
        onDefinir={() => (logged ? onDefinirPrio() : onToast("Entre com seu e-mail para definir as suas"))}
        onAbrir={(p) => (logged ? onPrioAbrir(p) : onToast("Exemplo — entre para usar as suas"))}
        onConcluir={(p) => (logged ? onPrioConcluir(p) : onToast("Exemplo — entre para usar as suas"))}
        onDrop={logged ? onDrop : undefined}
      />

      {diaInteiro.length > 0 && (
        <div className="allday stagger" style={{ ["--i" as string]: 0.6 }}>
          <span className="plabel">O dia todo</span>
          {diaInteiro.map((e) => (
            <button key={e.id} className={`allday-chip${e.origem === "google" ? " g" : ""}`} onClick={() => onEventoClick(e.id)}>
              {e.titulo}
            </button>
          ))}
        </div>
      )}

      <div className="daybody stagger" style={{ ["--i" as string]: 0.8 }}>
        <TimeGrid
          dias={[dia]}
          hoje={hoje}
          blocos={blocos}
          onSlotClick={logged ? onSlotClick : (_, h) => onToast(`Entre para criar um evento às ${hhmm(h)}`)}
          onDrop={logged ? onDrop : undefined}
          onBlocoClick={clicarBloco}
          onBlocoDblClick={(b) => logged && b.tipo === "tarefa" && !b.feita && onConcluirTarefa(b.id)}
        />
        {logged && (
          <aside className="dayside" aria-label="Tarefas do dia sem horário">
            <div className="dayside-h">
              ☐ Sem horário <span className="count">{semHorario.length || ""}</span>
            </div>
            {semHorario.length === 0 && <p className="empty-hint">nada por aqui — capture ou arraste de volta</p>}
            {semHorario.map((t) => (
              <div
                key={t.id}
                className="dayside-item"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({ tipo: "tarefa", id: t.id, durMin: t.duracao_min ?? 30 } satisfies DropInfo),
                  )
                }
                onPointerDown={(e) => arrasteToque(e, { tipo: "tarefa", id: t.id, durMin: t.duracao_min ?? 30 }, t.titulo, onDrop)}
              >
                <button className="box" role="checkbox" aria-checked={false} title="Concluir" onClick={() => onConcluirTarefa(t.id)}>
                  ✓
                </button>
                <button className="txt" title="Abrir a tarefa" onClick={() => onEditTarefa(t)}>
                  {t.titulo}
                  {vendoHoje && t.prazo && t.prazo < hoje && (
                    <span className="chip muted" style={{ color: "var(--today)", display: "block", width: "fit-content" }}>
                      venceu {t.prazo.split("-").reverse().slice(0, 2).join("/")}
                    </span>
                  )}
                </button>
              </div>
            ))}
            <input
              className="note-search dayside-add"
              placeholder="+ tarefa p/ este dia…"
              onKeyDown={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                if (e.key === "Enter" && v) {
                  onNovaTarefaDia(v, dia);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
            <p className="empty-hint" style={{ marginTop: 6 }}>arraste para a grade para dar hora · clique para abrir</p>
          </aside>
        )}
      </div>
    </div>
  );
}
