"use client";

import type { Container, Evento, Nota } from "@/lib/db";
import { snippetDe } from "@/lib/markdown";

/** Painel lateral do evento — clique num evento mostra as informações e a(s)
 *  nota(s) vinculada(s), sem cair direto na edição (feedback do Raul).
 *  Eventos do Google são só leitura: o sync espelha o que está lá. */

type Props = {
  evento: Evento;
  containers: Container[];
  notas: Nota[];
  onEditar: () => void;
  onExcluir: () => void;
  onNovaNota: () => void;
  onAbrirNota: (id: string) => void;
  onClose: () => void;
};

const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function fmtHora(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function EventoPanel({ evento, containers, notas, onEditar, onExcluir, onNovaNota, onAbrirNota, onClose }: Props) {
  const i = new Date(evento.inicio);
  const f = new Date(evento.fim);
  const grupo = containers.find((c) => c.id === evento.container_id);
  const doGoogle = evento.origem === "google";
  const notasDoEvento = notas.filter((n) => n.evento_id === evento.id);

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <aside className="side-panel" role="dialog" aria-label={`Evento: ${evento.titulo}`}>
        <div className="sp-head">
          <h2>{evento.titulo}</h2>
          <button className="sp-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <p className="sp-quando">
          {DIAS_LONGOS[i.getDay()]}, {i.getDate()} {MESES[i.getMonth()]} · {fmtHora(i)} – {fmtHora(f)}
        </p>

        <div className="pillrow" style={{ marginTop: 2 }}>
          {doGoogle ? (
            <span className="chip" style={{ background: "color-mix(in srgb, var(--google) 14%, var(--surface))", color: "var(--ink-2)" }}>
              G Google Agenda
            </span>
          ) : (
            <span className="chip muted">evento local</span>
          )}
          {grupo && (
            <span className="chip">
              {grupo.emoji ? `${grupo.emoji} ` : ""}
              {grupo.nome}
            </span>
          )}
        </div>

        <div className="note-h3">Notas deste evento</div>
        {notasDoEvento.length === 0 && (
          <p className="year-note">Nenhuma ainda — a nota nasce do evento: ata, decisões, próximos passos.</p>
        )}
        {notasDoEvento.map((n) => (
          <button key={n.id} className="backlink" onClick={() => onAbrirNota(n.id)}>
            <b>{n.titulo}</b>
            {snippetDe(n.md) || "— vazia —"}
          </button>
        ))}
        <button className="btn ghost sp-btn" onClick={onNovaNota}>
          ✎ Criar nota do evento
        </button>

        <div className="sp-foot">
          {doGoogle ? (
            <p className="year-note" style={{ margin: 0 }}>
              Este evento vem do Google — edite lá; o sync espelha aqui ⇄
            </p>
          ) : (
            <>
              <button className="btn ghost" style={{ color: "var(--today)" }} onClick={onExcluir}>
                Excluir
              </button>
              <button className="btn primary" onClick={onEditar}>
                Editar evento
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
