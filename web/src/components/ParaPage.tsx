"use client";

import { useState } from "react";
import {
  arquivarContainer,
  atualizarContainer,
  criarTarefa,
  definirAreasDoProjeto,
  desarquivarContainer,
  hojeISO,
  somaDias,
  type Container,
  type Kind,
  type Nota,
  type Pessoa,
  type ProjetoArea,
  type Tarefa,
} from "@/lib/db";
import { saudeDaArea, SAUDE_LABEL } from "@/lib/saude";
import IconePicker from "@/components/IconePicker";
import { linksDe, snippetDe } from "@/lib/markdown";
import { normalizar } from "@/lib/parser";

/** Páginas PARA — projeto, área ou recurso com descrição, objetivo,
 *  progresso, tarefas do grupo e notas vinculadas (protótipo v6).
 *  Um projeto pode pertencer a VÁRIAS áreas (N:N); a área mostra os
 *  projetos vinculados e as tarefas deles, com o chip do projeto. */

const KIND_LABEL = { projeto: "Projeto", area: "Área", recurso: "Recurso" } as const;

type Props = {
  userId: string;
  container: Container;
  /** todos os containers — áreas do projeto, projetos da área */
  containers: Container[];
  projetoAreas: ProjetoArea[];
  tarefas: Tarefa[];
  notas: Nota[];
  pessoas: Pessoa[];
  onBack: () => void;
  onConclude: (id: string) => void;
  onEditTarefa: (t: Tarefa) => void;
  onAbrirNota: (id: string) => void;
  onOpenContainer: (id: string) => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

export default function ParaPage({
  userId,
  container: c,
  containers,
  projetoAreas,
  tarefas,
  notas,
  pessoas,
  onBack,
  onConclude,
  onEditTarefa,
  onAbrirNota,
  onOpenContainer,
  onChanged,
  onToast,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [fNome, setFNome] = useState(c.nome);
  const [fEmoji, setFEmoji] = useState<string | null>(c.emoji);
  const [fDesc, setFDesc] = useState(c.descricao ?? "");
  const [fObj, setFObj] = useState(c.objetivo ?? "");
  const [fPrazo, setFPrazo] = useState(c.prazo ?? "");
  const [fAreas, setFAreas] = useState<string[]>(() =>
    projetoAreas.filter((l) => l.projeto_id === c.id).map((l) => l.area_id),
  );
  const [novaTarefa, setNovaTarefa] = useState("");

  const hoje = hojeISO();
  // Notas do grupo + notas que CITAM este projeto/área via [[link]] (Zettelkasten:
  // os links estruturam) — antes só as agrupadas apareciam, feedback do Raul
  const notasDoGrupo = notas.filter((n) => n.container_id === c.id);
  const notasQueCitam = notas.filter(
    (n) => n.container_id !== c.id && linksDe(n.md).some((t) => normalizar(t) === normalizar(c.nome)),
  );

  // Projeto ↔ áreas (N:N): as áreas deste projeto e os projetos desta área
  const areasDoProjeto =
    c.kind === "projeto"
      ? projetoAreas
          .filter((l) => l.projeto_id === c.id)
          .map((l) => containers.find((x) => x.id === l.area_id))
          .filter((x): x is Container => !!x)
      : [];
  const projetosDaArea =
    c.kind === "area"
      ? projetoAreas
          .filter((l) => l.area_id === c.id)
          .map((l) => containers.find((x) => x.id === l.projeto_id))
          .filter((x): x is Container => !!x)
      : [];
  const areas = containers.filter((x) => x.kind === "area" && x.id !== c.id);

  // A área contempla as tarefas dos projetos vinculados (com chip do projeto)
  const idsDoEscopo = [c.id, ...projetosDaArea.map((p) => p.id)];
  const doGrupo = tarefas.filter((t) => t.container_id !== null && idsDoEscopo.includes(t.container_id));
  const abertas = doGrupo.filter((t) => t.status !== "concluida" && t.status !== "algum_dia");
  const concluidas = doGrupo.filter((t) => t.status === "concluida");
  const pct = doGrupo.length ? Math.round((concluidas.length / doGrupo.length) * 100) : 0;
  const projetoDe = (t: Tarefa) =>
    t.container_id !== c.id ? projetosDaArea.find((p) => p.id === t.container_id) ?? null : null;

  // 15b: saúde da área (derivada) · 15a: pessoas do projeto e projeção de término
  const saude = c.kind === "area" && !c.arquivado_em ? saudeDaArea(idsDoEscopo, tarefas, notas) : null;
  const pessoasDoGrupo =
    c.kind === "projeto"
      ? pessoas
          .map((q) => ({ pessoa: q, pend: doGrupo.filter((t) => t.responsavel_id === q.id && t.status === "em_espera").length }))
          .filter((d) => doGrupo.some((t) => t.responsavel_id === d.pessoa.id))
      : [];
  const projecao = (() => {
    if (c.kind !== "projeto" || !c.prazo || c.arquivado_em || abertas.length === 0) return null;
    const corte = somaDias(hoje, -14);
    const ritmo = concluidas.filter((t) => (t.concluida_em ?? "").slice(0, 10) >= corte).length / 14;
    if (ritmo <= 0) return null;
    const termino = somaDias(hoje, Math.ceil(abertas.length / ritmo));
    const folga = Math.round((new Date(c.prazo).getTime() - new Date(termino).getTime()) / 86400000);
    if (folga === 0) return { ok: true, txt: "No ritmo atual, você termina em cima da meta. 🎯" };
    const sem = Math.abs(folga) >= 14 ? `${Math.round(Math.abs(folga) / 7)} semanas` : `${Math.abs(folga)} dia${Math.abs(folga) !== 1 ? "s" : ""}`;
    return folga > 0
      ? { ok: true, txt: `No ritmo atual, você termina ${sem} antes da meta. 🎯` }
      : { ok: false, txt: `No ritmo atual, o projeto passa ${sem} da meta — reforce ou renegocie o prazo.` };
  })();

  const salvar = async () => {
    if (!fNome.trim()) return;
    const err = await atualizarContainer(c.id, {
      nome: fNome.trim(),
      emoji: fEmoji?.trim() || null,
      descricao: fDesc.trim() || null,
      objetivo: fObj.trim() || null,
      prazo: c.kind === "projeto" ? fPrazo || null : undefined,
    });
    const errAreas = c.kind === "projeto" ? await definirAreasDoProjeto(userId, c.id, fAreas) : null;
    setEditando(false);
    if (err || errAreas) return onToast(`Erro ao salvar: ${err ?? errAreas}`);
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

  const desarquivar = async () => {
    const err = await desarquivarContainer(c.id);
    if (err) return onToast(`Erro ao desarquivar: ${err}`);
    onChanged();
    onToast(`"${c.nome}" de volta à ativa ✓`);
  };

  const criarRapida = async () => {
    const titulo = novaTarefa.trim();
    if (!titulo) return;
    const { err } = await criarTarefa(userId, { titulo, status: "a_fazer", container_id: c.id });
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
              <input className="tri-input" value={fNome} onChange={(e) => setFNome(e.target.value)} autoFocus />
              <div className="flab">Ícone</div>
              <IconePicker valor={fEmoji} onChange={setFEmoji} />
              {c.kind === "projeto" && areas.length > 0 && (
                <>
                  <div className="flab">Parte de quais áreas? (pode ser mais de uma)</div>
                  <div className="pillrow">
                    {areas.map((a) => (
                      <button
                        key={a.id}
                        className={`pill-opt${fAreas.includes(a.id) ? " on" : ""}`}
                        onClick={() =>
                          setFAreas((prev) => (prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]))
                        }
                      >
                        {a.emoji ? `${a.emoji} ` : ""}
                        {a.nome}
                      </button>
                    ))}
                  </div>
                </>
              )}
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
              <h1 className={c.arquivado_em ? "arquivado" : undefined}>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.nome}
              </h1>
              <div className="page-props">
                <span className="chip">{KIND_LABEL[c.kind]}</span>
                {saude && (
                  <span className={`chip saude saude-${saude}`} title="Saúde da área — derivada das tarefas e notas">
                    ● {SAUDE_LABEL[saude]}
                  </span>
                )}
                {c.arquivado_em && (
                  <span className="chip arch" title="Este container está no Arquivo — nada foi apagado">
                    ▤ arquivado em {c.arquivado_em.slice(0, 10).split("-").reverse().slice(0, 2).join("/")}
                  </span>
                )}
                {areasDoProjeto.map((a) => (
                  <button
                    key={a.id}
                    className="chip"
                    style={{ cursor: "pointer" }}
                    title={`Abrir a área ${a.nome}`}
                    onClick={() => onOpenContainer(a.id)}
                  >
                    ▣ {a.emoji ? `${a.emoji} ` : ""}
                    {a.nome}
                  </button>
                ))}
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
                {c.arquivado_em ? (
                  <button className="chip" style={{ cursor: "pointer" }} onClick={desarquivar}>
                    ↩ desarquivar
                  </button>
                ) : (
                  <button className="chip muted" style={{ cursor: "pointer" }} onClick={arquivar}>
                    ▤ arquivar
                  </button>
                )}
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
                    {c.kind === "area" && projetosDaArea.length > 0 ? " (incluindo os projetos vinculados)" : ""}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {c.kind === "area" && (
          <div className="page-sec">
            <h3>Projetos desta área</h3>
            {projetosDaArea.length === 0 && (
              <p className="empty-hint">Nenhum ainda — vincule pelo “✎ editar” do projeto (parte de quais áreas).</p>
            )}
            {projetosDaArea.map((pr) => {
              const doProjeto = tarefas.filter((t) => t.container_id === pr.id);
              const pendentes = doProjeto.filter((t) => t.status !== "concluida" && t.status !== "algum_dia").length;
              const feitas = doProjeto.filter((t) => t.status === "concluida").length;
              const pctPr = doProjeto.length ? Math.round((feitas / doProjeto.length) * 100) : 0;
              return (
                <button key={pr.id} className="listrow" onClick={() => onOpenContainer(pr.id)}>
                  {pr.emoji ? `${pr.emoji} ` : "▶ "}
                  {pr.nome}
                  {pr.prazo && (
                    <span className="chip muted" style={pr.prazo < hoje ? { color: "var(--today)" } : undefined}>
                      prazo {pr.prazo.split("-").reverse().slice(0, 2).join("/")}
                    </span>
                  )}
                  <span className="count">
                    {pendentes} aberta{pendentes !== 1 ? "s" : ""}
                    {doProjeto.length ? ` · ${pctPr}%` : ""}
                  </span>
                  <span className="go">›</span>
                </button>
              );
            })}
          </div>
        )}

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
                    {projetoDe(t) && (
                      <span className="chip" title="Tarefa de um projeto vinculado a esta área">
                        {projetoDe(t)!.emoji ? `${projetoDe(t)!.emoji} ` : "▶ "}
                        {projetoDe(t)!.nome}
                      </span>
                    )}
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
            {notasDoGrupo.length === 0 && notasQueCitam.length === 0 && (
              <p className="empty-hint">Nenhuma — agrupe uma nota aqui ou cite [[{c.nome}]] no texto dela.</p>
            )}
            {notasDoGrupo.map((n) => (
              <button key={n.id} className="backlink" onClick={() => onAbrirNota(n.id)}>
                <b>{n.titulo}</b>
                {snippetDe(n.md) || "— vazia —"}
              </button>
            ))}
            {notasQueCitam.length > 0 && (
              <>
                <p className="empty-hint" style={{ margin: "10px 0 6px" }}>
                  citam [[{c.nome}]] no texto:
                </p>
                {notasQueCitam.map((n) => (
                  <button key={n.id} className="backlink" onClick={() => onAbrirNota(n.id)}>
                    <b>{n.titulo}</b>
                    {snippetDe(n.md) || "— vazia —"}
                  </button>
                ))}
              </>
            )}

            {pessoasDoGrupo.length > 0 && (
              <>
                <h3 style={{ marginTop: 16 }}>Pessoas</h3>
                {pessoasDoGrupo.map((d) => (
                  <div key={d.pessoa.id} className="pg-pessoa">
                    <span className="pp-ava" style={{ background: "var(--terracotta-bg)", color: "var(--terracotta-deep)" }}>
                      {d.pessoa.nome.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="pg-pessoa-nome">@{d.pessoa.nome}</span>
                    <small className={d.pend ? "pg-pend" : undefined}>
                      {d.pend ? `${d.pend} pendência${d.pend !== 1 ? "s" : ""}` : "em dia"}
                    </small>
                  </div>
                ))}
              </>
            )}
            {projecao && <div className={`pg-projecao${projecao.ok ? "" : " atencao"}`}>{projecao.txt}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lista PARA (celular): projetos, áreas e recursos → página.
 *  Com kinds, mostra só esses tipos (cards do hub 7a); com soArquivo,
 *  vira a página do Arquivo (o A do PARA): só os arquivados. */
export function ParaLista({
  containers,
  arquivados,
  tarefas,
  soArquivo = false,
  kinds,
  onOpen,
}: {
  containers: Container[];
  arquivados: Container[];
  tarefas: Tarefa[];
  soArquivo?: boolean;
  kinds?: Kind[];
  onOpen: (id: string) => void;
}) {
  const abertas = (id: string) => tarefas.filter((t) => t.container_id === id && t.status !== "concluida").length;
  const todos: [string, Kind][] = [
    ["Projetos", "projeto"],
    ["Áreas", "area"],
    ["Recursos", "recurso"],
  ];
  const grupos: [string, Container[]][] = soArquivo
    ? []
    : todos
        .filter(([, k]) => !kinds || kinds.includes(k))
        .map(([label, k]) => [label, containers.filter((x) => x.kind === k)]);
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
        {!kinds && <div className="note-group-h">▤ Arquivo</div>}
        {!kinds && arquivados.length === 0 && (
          <p className="empty-hint">
            Nada arquivado ainda — ao concluir um projeto, arquive-o na página dele (nada se perde).
          </p>
        )}
        {(kinds ? [] : arquivados).map((x) => (
          <button key={x.id} className="listrow arquivado" onClick={() => onOpen(x.id)}>
            {x.emoji ? `${x.emoji} ` : ""}
            {x.nome}
            <span className="chip arch">{KIND_LABEL[x.kind]}</span>
            {x.arquivado_em && (
              <span className="count">{x.arquivado_em.slice(0, 10).split("-").reverse().slice(0, 2).join("/")}</span>
            )}
            <span className="go">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
