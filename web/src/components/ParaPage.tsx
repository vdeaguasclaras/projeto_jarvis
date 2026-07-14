"use client";

import { useState } from "react";
import {
  arquivarContainer,
  atualizarContainer,
  criarTarefa,
  hojeISO,
  type Container,
  type Nota,
  type Tarefa,
} from "@/lib/db";
import { snippetDe } from "@/lib/markdown";

/** Páginas PARA — projeto, área ou recurso com descrição, objetivo,
 *  progresso, tarefas do grupo e notas vinculadas (protótipo v6). */

const KIND_LABEL = { projeto: "Projeto", area: "Área", recurso: "Recurso" } as const;

type Props = {
  userId: string;
  container: Container;
  tarefas: Tarefa[];
  notas: Nota[];
  onBack: () => void;
  onConclude: (id: string) => void;
  onEditTarefa: (t: Tarefa) => void;
  onAbrirNota: (id: string) => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

export default function ParaPage({
  userId,
  container: c,
  tarefas,
  notas,
  onBack,
  onConclude,
  onEditTarefa,
  onAbrirNota,
  onChanged,
  onToast,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [fNome, setFNome] = useState(c.nome);
  const [fEmoji, setFEmoji] = useState(c.emoji ?? "");
  const [fDesc, setFDesc] = useState(c.descricao ?? "");
  const [fObj, setFObj] = useState(c.objetivo ?? "");
  const [fPrazo, setFPrazo] = useState(c.prazo ?? "");
  const [novaTarefa, setNovaTarefa] = useState("");

  const doGrupo = tarefas.filter((t) => t.container_id === c.id);
  const abertas = doGrupo.filter((t) => t.status !== "concluida" && t.status !== "algum_dia");
  const concluidas = doGrupo.filter((t) => t.status === "concluida");
  const pct = doGrupo.length ? Math.round((concluidas.length / doGrupo.length) * 100) : 0;
  const notasDoGrupo = notas.filter((n) => n.container_id === c.id);
  const hoje = hojeISO();

  const salvar = async () => {
    if (!fNome.trim()) return;
    const err = await atualizarContainer(c.id, {
      nome: fNome.trim(),
      emoji: fEmoji.trim() || null,
      descricao: fDesc.trim() || null,
      objetivo: fObj.trim() || null,
      prazo: c.kind === "projeto" ? fPrazo || null : undefined,
    });
    setEditando(false);
    if (err) return onToast(`Erro ao salvar: ${err}`);
    onChanged();
    onToast("Página atualizada ✓");
  };

  const arquivar = async () => {
    const aviso =
      c.kind === "projeto"
        ? `Arquivar o projeto "${c.nome}"? As tarefas e notas continuam guardadas (PARA: nada se perde).`
        : `Arquivar "${c.nome}"? Some da sidebar; tarefas e notas continuam guardadas.`;
    if (!window.confirm(aviso)) return;
    const err = await arquivarContainer(c.id);
    if (err) return onToast(`Erro ao arquivar: ${err}`);
    onChanged();
    onBack();
    onToast(`"${c.nome}" arquivado — o A do PARA ▤`);
  };

  const criarRapida = async () => {
    const titulo = novaTarefa.trim();
    if (!titulo) return;
    const err = await criarTarefa(userId, { titulo, status: "a_fazer", container_id: c.id });
    if (err) return onToast(`Erro: ${err}`);
    setNovaTarefa("");
    onChanged();
    onToast(`Tarefa criada em "${c.nome}" ✓`);
  };

  return (
    <div className="view-in">
      <div className="pagewrap">
        <button className="page-back" onClick={onBack}>
          ← Voltar
        </button>

        <div className="page-head">
          {editando ? (
            <div className="page-edit">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="tri-input"
                  style={{ flex: "0 1 70px", textAlign: "center" }}
                  value={fEmoji}
                  onChange={(e) => setFEmoji(e.target.value)}
                  placeholder="emoji"
                  maxLength={4}
                />
                <input className="tri-input" style={{ flex: 1 }} value={fNome} onChange={(e) => setFNome(e.target.value)} autoFocus />
              </div>
              <div className="flab">Descrição — do que se trata</div>
              <textarea className="tri-input" rows={2} value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
              <div className="flab">{c.kind === "projeto" ? "Objetivo — quando estará concluído" : "Padrão a manter"}</div>
              <textarea className="tri-input" rows={2} value={fObj} onChange={(e) => setFObj(e.target.value)} />
              {c.kind === "projeto" && (
                <>
                  <div className="flab">Prazo do projeto (opcional)</div>
                  <input className="tri-input" type="date" value={fPrazo} onChange={(e) => setFPrazo(e.target.value)} />
                </>
              )}
              <div className="modal-foot" style={{ marginTop: 8 }}>
                <button className="btn ghost" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
                <button className="btn primary" onClick={salvar}>
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.nome}
              </h1>
              <div className="page-props">
                <span className="chip">{KIND_LABEL[c.kind]}</span>
                {c.prazo && (
                  <span className="chip muted" style={c.prazo < hoje ? { color: "var(--today)" } : undefined}>
                    prazo {c.prazo.split("-").reverse().slice(0, 2).join("/")}
                  </span>
                )}
                <span className="chip muted">
                  {abertas.length} aberta{abertas.length !== 1 ? "s" : ""} · {concluidas.length} concluída{concluidas.length !== 1 ? "s" : ""}
                </span>
                <button className="chip" style={{ cursor: "pointer" }} onClick={() => setEditando(true)}>
                  ✎ editar
                </button>
                <button className="chip muted" style={{ cursor: "pointer" }} onClick={arquivar}>
                  ▤ arquivar
                </button>
              </div>
              {c.descricao && <p className="page-desc">{c.descricao}</p>}
              {c.objetivo && (
                <p className="page-desc" style={{ marginTop: 6 }}>
                  <b style={{ fontFamily: "var(--sans)", fontSize: 12 }}>🎯 </b>
                  {c.objetivo}
                </p>
              )}
              {doGrupo.length > 0 && (
                <>
                  <div className="progress">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <div className="progress-lbl">
                    {pct}% — {concluidas.length} de {doGrupo.length} tarefas concluídas
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="page-cols">
          <div className="page-sec">
            <h3>Tarefas {c.kind === "projeto" ? "do projeto" : c.kind === "area" ? "da área" : "do recurso"}</h3>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input
                className="note-search"
                placeholder="Nova tarefa aqui…"
                value={novaTarefa}
                onChange={(e) => setNovaTarefa(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criarRapida()}
              />
              <button className="btn-newnote" onClick={criarRapida}>
                +
              </button>
            </div>
            {abertas.length === 0 && <p className="empty-hint">Nenhuma tarefa aberta{c.kind === "projeto" ? " — defina o próximo passo" : ""}.</p>}
            {abertas.map((t) => (
              <div key={t.id} className="todo">
                <button className="box" role="checkbox" aria-checked={false} onClick={() => onConclude(t.id)}>
                  ✓
                </button>
                <button className="txt txt-btn" onClick={() => onEditTarefa(t)} title="Editar tarefa">
                  {t.titulo}
                  <div className="chips">
                    {t.prazo && (
                      <span className="chip muted" style={t.prazo < hoje ? { color: "var(--today)" } : undefined}>
                        {t.prazo < hoje ? "venceu " : ""}
                        {t.prazo.split("-").reverse().slice(0, 2).join("/")}
                      </span>
                    )}
                    {t.status === "em_espera" && <span className="chip muted">em espera</span>}
                    {t.recorrencia && <span className="chip muted">⟳</span>}
                  </div>
                </button>
              </div>
            ))}
            {concluidas.length > 0 && (
              <p className="empty-hint" style={{ marginTop: 8 }}>
                ✓ {concluidas.length} concluída{concluidas.length !== 1 ? "s" : ""} guardada{concluidas.length !== 1 ? "s" : ""} no histórico.
              </p>
            )}
          </div>

          <div className="page-sec">
            <h3>Notas vinculadas</h3>
            {notasDoGrupo.length === 0 && (
              <p className="empty-hint">Nenhuma — agrupar notas é opcional; os [[links]] também estruturam.</p>
            )}
            {notasDoGrupo.map((n) => (
              <button key={n.id} className="backlink" onClick={() => onAbrirNota(n.id)}>
                <b>{n.titulo}</b>
                {snippetDe(n.md) || "— vazia —"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lista PARA (celular): projetos, áreas e recursos → página. */
export function ParaLista({
  containers,
  tarefas,
  onOpen,
}: {
  containers: Container[];
  tarefas: Tarefa[];
  onOpen: (id: string) => void;
}) {
  const abertas = (id: string) => tarefas.filter((t) => t.container_id === id && t.status !== "concluida").length;
  const grupos: [string, Container[]][] = [
    ["Projetos", containers.filter((x) => x.kind === "projeto")],
    ["Áreas", containers.filter((x) => x.kind === "area")],
    ["Recursos", containers.filter((x) => x.kind === "recurso")],
  ];
  return (
    <div className="view-in">
      <div className="pagewrap">
        {grupos.map(([label, cs]) => (
          <div key={label}>
            <div className="note-group-h">{label}</div>
            {cs.length === 0 && <p className="empty-hint">nenhum ainda</p>}
            {cs.map((x) => (
              <button key={x.id} className="listrow" onClick={() => onOpen(x.id)}>
                {x.emoji ? `${x.emoji} ` : ""}
                {x.nome}
                <span className="count">{abertas(x.id) || ""}</span>
                <span className="go">›</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
