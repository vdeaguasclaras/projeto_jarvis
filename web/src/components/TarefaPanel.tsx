"use client";

import { useState } from "react";
import { isoDe } from "@/components/TimeGrid";
import CapturaImagem from "@/components/CapturaImagem";
import { hojeISO, type Container, type Pessoa, type Recorrencia, type Tarefa, type TarefaStatus } from "@/lib/db";

/** Painel lateral da tarefa (padrão Notion, pedido do Raul): tudo o que se
 *  clica abre aqui — nome, horário do dia, duração, anotações, grupo, status
 *  e recorrência, todos editáveis. */

export type TarefaEdicao = {
  titulo: string;
  prazo: string | null;
  container_id: string | null;
  responsavel_id: string | null;
  descricao: string | null;
  status: TarefaStatus;
  recorrencia: Recorrencia | null;
  recorre_ate: string | null;
  agendada_inicio: string | null;
  agendada_fim: string | null;
  duracao_min: number | null;
};

type Props = {
  tarefa: Tarefa;
  containers: Container[];
  pessoas: Pessoa[];
  onSave: (campos: TarefaEdicao) => void;
  onConcluir: () => void;
  onDelete: () => void;
  onClose: () => void;
};

const RECORRENCIAS: [Recorrencia | null, string][] = [
  [null, "não repete"],
  ["diaria", "diária"],
  ["semanal", "semanal"],
  ["quinzenal", "quinzenal"],
  ["mensal", "mensal"],
];

const STATUS: [TarefaStatus, string][] = [
  ["a_fazer", "a fazer"],
  ["em_andamento", "em andamento"],
  ["em_espera", "em espera"],
  ["algum_dia", "algum dia"],
];

const DURACOES = [15, 30, 45, 60, 90, 120, 180, 240];

function horaDe(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dataDe(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TarefaPanel({ tarefa, containers, pessoas, onSave, onConcluir, onDelete, onClose }: Props) {
  const [titulo, setTitulo] = useState(tarefa.titulo);
  const [descricao, setDescricao] = useState(tarefa.descricao ?? "");
  const [prazo, setPrazo] = useState(tarefa.prazo ?? "");
  const [containerId, setContainerId] = useState(tarefa.container_id);
  const [responsavelId, setResponsavelId] = useState(tarefa.responsavel_id);
  const [status, setStatus] = useState<TarefaStatus>(tarefa.status === "concluida" ? "a_fazer" : tarefa.status);
  const [rec, setRec] = useState<Recorrencia | null>(tarefa.recorrencia);
  const [ate, setAte] = useState(tarefa.recorre_ate ?? "");

  // Horário no dia — a tarefa pode viver sem ele (fica na coluna "sem horário")
  const [comHorario, setComHorario] = useState(!!tarefa.agendada_inicio);
  const [dia, setDia] = useState(tarefa.agendada_inicio ? dataDe(tarefa.agendada_inicio) : tarefa.prazo ?? hojeISO());
  const [hora, setHora] = useState(tarefa.agendada_inicio ? horaDe(tarefa.agendada_inicio) : "09:00");
  const [dur, setDur] = useState<number>(
    tarefa.agendada_inicio && tarefa.agendada_fim
      ? Math.max(15, Math.round((new Date(tarefa.agendada_fim).getTime() - new Date(tarefa.agendada_inicio).getTime()) / 60000))
      : (tarefa.duracao_min ?? 30),
  );

  const pill = (on: boolean) => `pill-opt${on ? " on" : ""}`;
  const concluida = tarefa.status === "concluida";

  const salvar = () => {
    if (!titulo.trim()) return;
    let agendada: { agendada_inicio: string | null; agendada_fim: string | null } = {
      agendada_inicio: null,
      agendada_fim: null,
    };
    let prazoFinal = prazo || null;
    if (comHorario && dia && hora) {
      const [hh, mm] = hora.split(":").map(Number);
      const h = (hh || 0) + (mm || 0) / 60;
      agendada = { agendada_inicio: isoDe(dia, h), agendada_fim: isoDe(dia, h + dur / 60) };
      prazoFinal = dia; // o prazo acompanha o dia agendado
    }
    onSave({
      titulo: titulo.trim(),
      prazo: prazoFinal,
      container_id: containerId,
      responsavel_id: responsavelId,
      descricao: descricao.trim() || null,
      status,
      recorrencia: rec,
      recorre_ate: rec ? ate || null : null,
      ...agendada,
      duracao_min: dur,
    });
  };

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <aside className="side-panel" role="dialog" aria-label={`Tarefa: ${tarefa.titulo}`}>
        <div className="sp-head">
          <h2 style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
            <button
              className={`box sp-check${concluida ? " done" : ""}`}
              role="checkbox"
              aria-checked={concluida}
              title={concluida ? "Concluída" : "Concluir tarefa"}
              onClick={() => !concluida && onConcluir()}
            >
              ✓
            </button>
            <input
              className="sp-title-in"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
            />
          </h2>
          <button className="sp-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        {concluida && <p className="sp-quando">✓ concluída — editar reabre como “a fazer”</p>}

        {tarefa.imagem_path && <CapturaImagem path={tarefa.imagem_path} alt={`Imagem de ${tarefa.titulo}`} />}

        <div className="flab">Horário no dia</div>
        <div className="pillrow" style={{ marginBottom: comHorario ? 8 : 0 }}>
          <button className={pill(!comHorario)} onClick={() => setComHorario(false)}>
            sem horário
          </button>
          <button className={pill(comHorario)} onClick={() => setComHorario(true)}>
            com horário
          </button>
        </div>
        {comHorario ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 130px" }}>
              <div className="flab">Dia</div>
              <input className="tri-input" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
            </div>
            <div style={{ flex: "0 1 100px" }}>
              <div className="flab">Início</div>
              <input className="tri-input" type="time" step={900} value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
            <div style={{ flex: "0 1 110px" }}>
              <div className="flab">Duração</div>
              <select className="tri-input" value={dur} onChange={(e) => setDur(Number(e.target.value))}>
                {[...new Set([...DURACOES, dur])].sort((a, b) => a - b).map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ flex: "0 1 150px" }}>
              <div className="flab">Prazo (opcional)</div>
              <input className="tri-input" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flab">Anotações</div>
        <textarea
          className="tri-input"
          rows={4}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Contexto, próximos passos, telefone, link…"
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 150px" }}>
            <div className="flab">Projeto / área</div>
            <select className="tri-input" value={containerId ?? ""} onChange={(e) => setContainerId(e.target.value || null)}>
              <option value="">— nenhum —</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ""}
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          {pessoas.length > 0 && (
            <div style={{ flex: "1 1 130px" }}>
              <div className="flab">Com / para quem</div>
              <select className="tri-input" value={responsavelId ?? ""} onChange={(e) => setResponsavelId(e.target.value || null)}>
                <option value="">— ninguém —</option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>
                    @{p.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flab">Status</div>
        <div className="pillrow">
          {STATUS.map(([s, label]) => (
            <button key={s} className={pill(status === s)} onClick={() => setStatus(s)}>
              {label}
            </button>
          ))}
        </div>

        <div className="flab">Recorrência</div>
        <div className="pillrow">
          {RECORRENCIAS.map(([r, label]) => (
            <button key={String(r)} className={pill(rec === r)} onClick={() => setRec(r)}>
              {label}
            </button>
          ))}
        </div>
        {rec && (
          <>
            <div className="flab">Repetir até (opcional — vazio repete sem fim)</div>
            <input className="tri-input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </>
        )}

        <div className="sp-foot">
          <button className="btn ghost" style={{ marginRight: "auto", color: "var(--today)" }} onClick={onDelete}>
            Excluir
          </button>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={salvar}>
            Salvar
          </button>
        </div>
      </aside>
    </>
  );
}
