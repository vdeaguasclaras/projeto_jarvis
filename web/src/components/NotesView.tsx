"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  atualizarNota,
  criarNota,
  criarTarefa,
  excluirNota,
  listNotas,
  type Container,
  type Nota,
} from "@/lib/db";
import { encaminhamentosDe, linksDe, mdToHtml, pessoasDe, snippetDe, tagsDe } from "@/lib/markdown";
import { normalizar } from "@/lib/parser";

/** Fase 3 — Notas (Zettelkasten), o módulo do protótipo v6 sobre dados reais:
 *  markdown, [[links]] com autocompletar, backlinks, agrupamento OPCIONAL
 *  (são os links que estruturam, não as pastas) e encaminhamentos → tarefas. */

type Props = {
  logged: boolean;
  userId: string | null;
  containers: Container[];
  /** id de nota para abrir ao montar (ex.: nota que nasceu de um evento) */
  abrirId: string | null;
  onToast: (msg: string) => void;
  onChanged: () => void;
};

type Modo = "fluxo" | "grupo" | "tema";

function dataCurta(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function NotesView({ logged, userId, containers, abrirId, onToast, onChanged }: Props) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [curId, setCurId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<Modo>("fluxo");
  const [editando, setEditando] = useState(false);
  const [metaAberto, setMetaAberto] = useState(false);
  const [ac, setAc] = useState<string[]>([]);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const salvarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abriuRef = useRef(false);

  const recarregar = useCallback(async () => {
    const ns = await listNotas();
    setNotas(ns);
    return ns;
  }, []);

  useEffect(() => {
    if (!logged) return;
    recarregar().then((ns) => {
      if (!abriuRef.current) {
        abriuRef.current = true;
        setCurId(abrirId ?? ns[0]?.id ?? null);
        if (abrirId) setEditando(true);
      }
    });
  }, [logged, recarregar, abrirId]);

  const nota = notas.find((n) => n.id === curId) ?? null;

  // ── persistência com atraso (autosave) ──
  const agendarSalvar = useCallback(
    (id: string, campos: { titulo?: string; md?: string }) => {
      if (salvarTimer.current) clearTimeout(salvarTimer.current);
      salvarTimer.current = setTimeout(async () => {
        const err = await atualizarNota(id, campos);
        if (err) onToast(`Erro ao salvar a nota: ${err}`);
      }, 700);
    },
    [onToast],
  );

  const editarLocal = (id: string, campos: Partial<Nota>) => {
    setNotas((prev) => prev.map((n) => (n.id === id ? { ...n, ...campos } : n)));
  };

  const novaNota = async (titulo = "Nova nota", md = "", abrirEdicao = true) => {
    if (!userId) return null;
    const { id, err } = await criarNota(userId, titulo, md);
    if (err || !id) {
      onToast(`Erro ao criar: ${err}`);
      return null;
    }
    await recarregar();
    setCurId(id);
    setEditando(abrirEdicao);
    return id;
  };

  const abrirWikilink = async (titulo: string) => {
    const alvo = notas.find((n) => normalizar(n.titulo) === normalizar(titulo));
    if (alvo) {
      setCurId(alvo.id);
      setEditando(false);
    } else {
      const id = await novaNota(titulo, "");
      if (id) onToast(`Nota "${titulo}" criada a partir do link — é assim que a rede cresce ✎`);
    }
  };

  const apagar = async () => {
    if (!nota) return;
    if (!window.confirm(`Excluir a nota "${nota.titulo}"? Os links que apontam para cá ficam órfãos.`)) return;
    const err = await excluirNota(nota.id);
    if (err) return onToast(`Erro ao excluir: ${err}`);
    const ns = await recarregar();
    setCurId(ns[0]?.id ?? null);
    onToast("Nota excluída");
  };

  const criarEncaminhamentos = async () => {
    if (!nota || !userId) return;
    const linhas = encaminhamentosDe(nota.md);
    for (const titulo of linhas) {
      await criarTarefa(userId, {
        titulo,
        status: "a_fazer",
        container_id: nota.container_id,
        nota_origem_id: nota.id,
      });
    }
    onChanged();
    onToast(
      `${linhas.length} encaminhamento${linhas.length > 1 ? "s viraram tarefas" : " virou tarefa"} — vinculados a esta nota ✓`,
    );
  };

  // ── autocompletar de [[links]] no editor ──
  const alvoAc = (): { inicio: number; q: string } | null => {
    const ta = taRef.current;
    if (!ta) return null;
    const antes = ta.value.slice(0, ta.selectionStart);
    const m = antes.match(/\[\[([^\]\n]*)$/);
    return m ? { inicio: antes.length - m[1].length, q: m[1] } : null;
  };

  const refreshAc = () => {
    const alvo = alvoAc();
    if (!alvo) return setAc([]);
    const q = normalizar(alvo.q);
    const titulos = [
      ...notas.filter((n) => n.id !== curId).map((n) => n.titulo),
      ...containers.map((c) => c.nome),
    ];
    setAc([...new Set(titulos)].filter((t) => !q || normalizar(t).includes(q)).slice(0, 6));
  };

  const completarAc = (titulo: string) => {
    const ta = taRef.current;
    const alvo = alvoAc();
    if (!ta || !alvo || !nota) return;
    const depois = ta.value.slice(ta.selectionStart);
    const md = ta.value.slice(0, alvo.inicio) + titulo + "]]" + (depois.startsWith("]]") ? depois.slice(2) : depois);
    editarLocal(nota.id, { md });
    agendarSalvar(nota.id, { md });
    setAc([]);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = alvo.inicio + titulo.length + 2;
      ta.setSelectionRange(pos, pos);
    });
  };

  // ── derivados ──
  const grupoDe = (n: Nota) => containers.find((c) => c.id === n.container_id) ?? null;
  const backlinks = useMemo(
    () => (nota ? notas.filter((n) => n.id !== nota.id && linksDe(n.md).some((t) => normalizar(t) === normalizar(nota.titulo))) : []),
    [notas, nota],
  );

  const q = normalizar(busca);
  const filtradas = notas.filter((n) => !q || normalizar(n.titulo).includes(q) || normalizar(n.md).includes(q));

  const secoes: [string, Nota[]][] = useMemo(() => {
    if (modo === "grupo") {
      const nomes = [...new Set(filtradas.map((n) => grupoDe(n)?.nome ?? "Sem grupo — atômicas"))];
      return nomes.map((g) => [g, filtradas.filter((n) => (grupoDe(n)?.nome ?? "Sem grupo — atômicas") === g)]);
    }
    if (modo === "tema") {
      const tags = [...new Set(filtradas.flatMap((n) => tagsDe(n.md)))];
      const sem = filtradas.filter((n) => tagsDe(n.md).length === 0);
      return [
        ...tags.map((t) => [`#${t}`, filtradas.filter((n) => tagsDe(n.md).includes(t))] as [string, Nota[]]),
        ...(sem.length ? [["sem tema", sem] as [string, Nota[]]] : []),
      ];
    }
    return [["", filtradas]];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, notas, busca, containers]);

  if (!logged) {
    return (
      <div className="view-in">
        <div className="soon">
          <h2>Notas</h2>
          <p>Entre com seu e-mail para escrever as suas — markdown, [[links]] e backlinks (Zettelkasten).</p>
          <span className="chip">Fase 3 · notas conectadas</span>
        </div>
      </div>
    );
  }

  const encaminhamentos = nota ? encaminhamentosDe(nota.md).length : 0;

  const item = (n: Nota) => (
    <button
      key={n.id}
      className={`note-item${n.id === curId ? " active" : ""}`}
      onClick={() => {
        setCurId(n.id);
        setEditando(false);
        setMetaAberto(false);
      }}
    >
      <b>{n.titulo}</b>
      <span className="snip">{snippetDe(n.md) || "— vazia —"}</span>
      <span className="chips">
        {grupoDe(n) ? (
          <span className="chip">
            {grupoDe(n)!.emoji ? `${grupoDe(n)!.emoji} ` : ""}
            {grupoDe(n)!.nome}
          </span>
        ) : (
          <span className="chip muted">sem grupo · atômica</span>
        )}
        {tagsDe(n.md).slice(0, 2).map((t) => (
          <span key={t} className="chip muted">
            #{t}
          </span>
        ))}
        <span className="chip muted">{dataCurta(n.atualizada_em)}</span>
      </span>
    </button>
  );

  return (
    <div className="view-in">
      <div className="notes-wrap">
        <div className="note-list stagger" style={{ ["--i" as string]: 0 }}>
          <div className="note-list-head">
            <input
              className="note-search"
              placeholder="Buscar nota…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <button className="btn-newnote" onClick={() => novaNota()}>
              + Nova
            </button>
          </div>
          <div className="pillrow" style={{ margin: "0 0 10px" }}>
            {(["fluxo", "grupo", "tema"] as Modo[]).map((m) => (
              <button key={m} className={`pill-opt${modo === m ? " on" : ""}`} onClick={() => setModo(m)}>
                {m === "fluxo" ? "Fluxo" : m === "grupo" ? "Por grupo" : "Por tema"}
              </button>
            ))}
          </div>
          {filtradas.length === 0 && (
            <p className="year-note">
              {notas.length === 0 ? "Nenhuma nota ainda — crie a primeira, ou destile uma captura na triagem." : "Nenhuma nota encontrada."}
            </p>
          )}
          {secoes.map(([titulo, ns]) => (
            <div key={titulo || "fluxo"}>
              {titulo && <div className="note-group-h">{titulo}</div>}
              {ns.map(item)}
            </div>
          ))}
        </div>

        {nota ? (
          <div className="note-editor stagger" style={{ ["--i" as string]: 1 }}>
            <div className="note-ed-head">
              <input
                className="note-title-in"
                value={nota.titulo}
                onChange={(e) => {
                  editarLocal(nota.id, { titulo: e.target.value });
                  agendarSalvar(nota.id, { titulo: e.target.value || "Sem título" });
                }}
              />
              <div className="yeartabs" style={{ margin: 0 }}>
                <button className={editando ? "" : "active"} onClick={() => setEditando(false)}>
                  Visualizar
                </button>
                <button className={editando ? "active" : ""} onClick={() => setEditando(true)}>
                  Editar
                </button>
              </div>
            </div>

            <div className="pillrow" style={{ margin: "0 0 10px" }}>
              {nota.evento_id && (
                <span className="chip muted" title="Nota que nasceu de um evento do calendário">
                  📅 nasceu de um evento
                </span>
              )}
              <button
                className={`chip${grupoDe(nota) ? "" : " muted"}`}
                style={{ cursor: "pointer" }}
                title="Agrupar é opcional — os links estruturam"
                onClick={() => setMetaAberto((v) => !v)}
              >
                {grupoDe(nota) ? `${grupoDe(nota)!.emoji ? grupoDe(nota)!.emoji + " " : ""}${grupoDe(nota)!.nome}` : "sem grupo"} ▾
              </button>
              {tagsDe(nota.md).map((t) => (
                <span key={t} className="chip muted">
                  #{t}
                </span>
              ))}
              {pessoasDe(nota.md).map((p) => (
                <span key={p} className="chip person">
                  @{p}
                </span>
              ))}
            </div>

            {metaAberto && (
              <div className="meta-pop show">
                <div className="flab" style={{ marginTop: 0 }}>
                  Grupo da nota — opcional (projeto, área ou recurso)
                </div>
                <div className="pillrow" style={{ marginBottom: 0 }}>
                  <button
                    className={`pill-opt${!nota.container_id ? " on" : ""}`}
                    onClick={async () => {
                      editarLocal(nota.id, { container_id: null });
                      await atualizarNota(nota.id, { container_id: null });
                      onToast("Nota sem grupo — atômica; os links continuam intactos");
                    }}
                  >
                    Nenhum · atômica
                  </button>
                  {containers.map((c) => (
                    <button
                      key={c.id}
                      className={`pill-opt${nota.container_id === c.id ? " on" : ""}`}
                      onClick={async () => {
                        editarLocal(nota.id, { container_id: c.id });
                        await atualizarNota(nota.id, { container_id: c.id });
                        onToast(`Nota agrupada em "${c.nome}" — os links continuam intactos`);
                      }}
                    >
                      {c.emoji ? `${c.emoji} ` : ""}
                      {c.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editando ? (
              <>
                <textarea
                  ref={taRef}
                  className="note-md"
                  value={nota.md}
                  spellCheck={false}
                  placeholder={"Uma ideia por nota. Use [[título]] para ligar a outra nota, #tag para temas, @pessoa para gente.\n\n- [ ] linhas assim viram tarefas com um clique"}
                  onChange={(e) => {
                    editarLocal(nota.id, { md: e.target.value });
                    agendarSalvar(nota.id, { md: e.target.value });
                    requestAnimationFrame(refreshAc);
                  }}
                  onClick={refreshAc}
                  onKeyUp={(e) => {
                    if (e.key === "Escape") setAc([]);
                  }}
                />
                {ac.length > 0 && (
                  <div className="ac-list">
                    {ac.map((t) => (
                      <button key={t} className="ac-item" onMouseDown={(e) => (e.preventDefault(), completarAc(t))}>
                        [[{t}]]
                      </button>
                    ))}
                  </div>
                )}
                <p className="capture-hint" style={{ marginTop: 6 }}>
                  # ## ### títulos · **negrito** · *itálico* · `código` · ~~riscado~~ · &gt; citação · - lista · - [ ] vira tarefa · [[link]] · --- divisória
                </p>
              </>
            ) : (
              <div
                className="note note-render"
                dangerouslySetInnerHTML={{ __html: mdToHtml(nota.md) || "<p style='color:var(--ink-3)'>— nota vazia — clique em Editar para escrever</p>" }}
                onClick={(e) => {
                  const wl = (e.target as HTMLElement).closest(".wikilink") as HTMLElement | null;
                  if (wl?.dataset.nota) abrirWikilink(wl.dataset.nota);
                }}
              />
            )}

            {encaminhamentos > 0 && (
              <button className="btn primary" style={{ marginTop: 14 }} onClick={criarEncaminhamentos}>
                ⚡ Criar {encaminhamentos} tarefa{encaminhamentos > 1 ? "s" : ""} dos encaminhamentos
              </button>
            )}

            <div className="note-h3">Backlinks — notas que apontam para cá</div>
            {backlinks.length ? (
              backlinks.map((b) => (
                <button key={b.id} className="backlink" onClick={() => (setCurId(b.id), setEditando(false))}>
                  <b>{b.titulo}</b>
                  {snippetDe(b.md)}
                </button>
              ))
            ) : (
              <p className="year-note">Nenhuma nota aponta para cá ainda — no Zettelkasten, são os links que estruturam, não as pastas.</p>
            )}

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button className="btn ghost" style={{ color: "var(--today)" }} onClick={apagar}>
                Excluir nota
              </button>
            </div>
          </div>
        ) : (
          <div className="note-editor stagger" style={{ ["--i" as string]: 1 }}>
            <p className="year-note">Crie a primeira nota com o botão “+ Nova” — uma ideia por nota, ligadas por [[links]].</p>
          </div>
        )}
      </div>
    </div>
  );
}
