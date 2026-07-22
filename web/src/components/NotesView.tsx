"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import EditorVivo from "@/components/EditorVivo";

/** Fase 3 — Notas (Zettelkasten), o módulo do protótipo v6 sobre dados reais:
 *  markdown, [[links]] com autocompletar, backlinks, agrupamento OPCIONAL
 *  (são os links que estruturam, não as pastas) e encaminhamentos → tarefas. */

type Props = {
  logged: boolean;
  userId: string | null;
  containers: Container[];
  /** arquivados: a nota agrupada neles continua mostrando o grupo, apagado */
  arquivados: Container[];
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

export default function NotesView({ logged, userId, containers, arquivados, abrirId, onToast, onChanged }: Props) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [curId, setCurId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<Modo>("fluxo");
  const [editando, setEditando] = useState(false);
  const [metaAberto, setMetaAberto] = useState(false);
  const [guiaAberto, setGuiaAberto] = useState(false);
  const [expandida, setExpandida] = useState(false);
  const [salvo, setSalvo] = useState(true);
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
      setSalvo(false);
      if (salvarTimer.current) clearTimeout(salvarTimer.current);
      salvarTimer.current = setTimeout(async () => {
        const err = await atualizarNota(id, campos);
        if (err) onToast(`Erro ao salvar a nota: ${err}`);
        else setSalvo(true);
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

  // ── barra de formatação (8a): insere a marcação no cursor ──
  const inserir = useCallback(
    (antes: string, depois = "", linha = false) => {
      const ta = taRef.current;
      const n = notas.find((x) => x.id === curId);
      if (!ta || !n) return;
      const [i, f] = [ta.selectionStart, ta.selectionEnd];
      let md: string;
      let pos: number;
      if (linha) {
        // prefixo de linha (## , - ): entra no começo da linha atual
        const ini = ta.value.lastIndexOf("\n", i - 1) + 1;
        md = ta.value.slice(0, ini) + antes + ta.value.slice(ini);
        pos = f + antes.length;
      } else {
        const sel = ta.value.slice(i, f);
        md = ta.value.slice(0, i) + antes + sel + depois + ta.value.slice(f);
        pos = (sel ? f : i) + antes.length + (sel ? depois.length : 0);
      }
      editarLocal(n.id, { md });
      agendarSalvar(n.id, { md });
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(pos, pos);
      });
    },
    [notas, curId, agendarSalvar],
  );

  // ── atalhos da tela (12a/13a): n nova · e expande · ? guia · Esc volta ──
  useEffect(() => {
    if (!logged) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (guiaAberto) setGuiaAberto(false);
        else if (expandida) setExpandida(false);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") {
        e.preventDefault();
        novaNota();
      } else if (e.key === "e" && curId) {
        e.preventDefault();
        setExpandida(true);
      } else if (e.key === "?") {
        e.preventDefault();
        setGuiaAberto((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged, guiaAberto, expandida, curId, userId]);

  // ── derivados ──
  const grupoDe = (n: Nota) =>
    containers.find((c) => c.id === n.container_id) ?? arquivados.find((c) => c.id === n.container_id) ?? null;
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
  }, [modo, notas, busca, containers, arquivados]);

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

  // ── pedaços compartilhados entre o painel (12a) e a nota expandida (12b) ──
  const corpoEdicao = nota && (
    <>
      <EditorVivo
        valor={nota.md}
        taRef={taRef}
        placeholder={"Uma ideia por nota. Use [[título]] para ligar a outra nota, #tag para temas, @pessoa para gente.\n\n- [ ] linhas assim viram tarefas com um clique"}
        onMudar={(md) => {
          editarLocal(nota.id, { md });
          agendarSalvar(nota.id, { md });
          requestAnimationFrame(refreshAc);
        }}
        onCursor={refreshAc}
        onEsc={() => setAc([])}
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
      {/* 8a — barra de formatação sobre o teclado (só no celular, via CSS) */}
      <div className="mdbar">
        <button style={{ fontWeight: 700 }} onClick={() => inserir("**", "**")} title="Negrito">B</button>
        <button style={{ fontStyle: "italic" }} onClick={() => inserir("*", "*")} title="Itálico">I</button>
        <button className="mv-verde" onClick={() => inserir("## ", "", true)} title="Título de seção">H2</button>
        <button className="mv-terra" onClick={() => inserir("- ", "", true)} title="Item de lista">•—</button>
        <button className="mv-lilas" onClick={() => inserir("[[", "]]")} title="Conectar a outra nota">[[ ]]</button>
        <button className="mv-terra" onClick={() => inserir("@")} title="Mencionar pessoa">@</button>
        <button className="mv-verde" onClick={() => inserir("#")} title="Ligar a projeto/tema">#</button>
      </div>
    </>
  );

  const corpoLeitura = nota && (
    <div
      className="note note-render"
      dangerouslySetInnerHTML={{ __html: mdToHtml(nota.md) || "<p style='color:var(--ink-3)'>— nota vazia — clique em Editar para escrever</p>" }}
      onClick={(e) => {
        const wl = (e.target as HTMLElement).closest(".wikilink") as HTMLElement | null;
        if (wl?.dataset.nota) abrirWikilink(wl.dataset.nota);
      }}
    />
  );

  const conexoes = nota && (
    <div className="nota-conex">
      <span className="nc-lbl">Conexões</span>
      {[...new Set(linksDe(nota.md))].map((t) => (
        <button key={t} className="nc-chip wl" onClick={() => abrirWikilink(t)}>
          [[{t}]]
        </button>
      ))}
      {grupoDe(nota) && (
        <span className="nc-chip grupo">
          {grupoDe(nota)!.kind === "projeto" ? "▶ " : "▣ "}
          {grupoDe(nota)!.nome}
        </span>
      )}
      {pessoasDe(nota.md).map((p) => (
        <span key={p} className="nc-chip at">
          @{p}
        </span>
      ))}
      <span className="nc-back">
        {backlinks.length
          ? `${backlinks.length} nota${backlinks.length > 1 ? "s apontam" : " aponta"} para cá`
          : "nada aponta para cá ainda"}
      </span>
    </div>
  );

  const indicadorSalvo = <span className={`nv-salvo${salvo ? "" : " salvando"}`}>{salvo ? "Salvo ✓" : "salvando…"}</span>;

  const guia = guiaAberto && (
    <div className="guia-pop">
      <div className="guia-head">
        <span>Guia de marcações</span>
        <button onClick={() => setGuiaAberto(false)} aria-label="Fechar">✕</button>
      </div>
      <div className="guia-grid">
        <code className="mv-verde">#</code><span>Título grande</span>
        <code className="mv-verde">##</code><span>Título de seção</span>
        <code className="mv-verde">###</code><span>Subtítulo</span>
        <code>**texto**</code><span><b>negrito</b></span>
        <code>*texto*</code><span><i>itálico</i></span>
        <code className="mv-terra">-</code><span>item de lista</span>
        <code className="mv-terra">- [ ]</code><span>vira tarefa</span>
        <code className="mv-verde">&gt;</code><span>citação</span>
        <code className="mv-lilas">[[nota]]</code><span>conecta a outra nota</span>
        <code className="mv-terra">@nome</code><span>menciona uma pessoa</span>
        <code className="mv-verde">#projeto</code><span>liga a um projeto</span>
      </div>
      <div className="guia-foot">Atalho <kbd>?</kbd> abre e fecha este guia</div>
    </div>
  );

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
          <span className={`chip${grupoDe(n)!.arquivado_em ? " arch" : ""}`}>
            {grupoDe(n)!.arquivado_em ? "▤ " : ""}
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
            <div className="nv-topo">
              {indicadorSalvo}
              <div className="nv-acoes">
                <div className="seg" role="tablist" aria-label="Modo da nota">
                  <button role="tab" className={editando ? "on" : ""} onClick={() => setEditando(true)}>
                    Editar
                  </button>
                  <button role="tab" className={editando ? "" : "on"} onClick={() => setEditando(false)}>
                    Leitura
                  </button>
                </div>
                <button
                  className={`nv-btn${guiaAberto ? " on" : ""}`}
                  title="Guia de marcações (?)"
                  onClick={() => setGuiaAberto((v) => !v)}
                >
                  ?
                </button>
                <button className="nv-btn" title="Expandir (E)" onClick={() => setExpandida(true)}>
                  ⤢ Expandir <kbd>E</kbd>
                </button>
              </div>
            </div>
            {guia}
            <input
              className="note-title-in"
              value={nota.titulo}
              onChange={(e) => {
                editarLocal(nota.id, { titulo: e.target.value });
                agendarSalvar(nota.id, { titulo: e.target.value || "Sem título" });
              }}
            />

            <div className="pillrow" style={{ margin: "0 0 10px" }}>
              {nota.evento_id && (
                <span className="chip muted" title="Nota que nasceu de um evento do calendário">
                  📅 nasceu de um evento
                </span>
              )}
              <button
                className={`chip${grupoDe(nota) ? (grupoDe(nota)!.arquivado_em ? " arch" : "") : " muted"}`}
                style={{ cursor: "pointer" }}
                title={grupoDe(nota)?.arquivado_em ? "Este grupo está no Arquivo" : "Agrupar é opcional — os links estruturam"}
                onClick={() => setMetaAberto((v) => !v)}
              >
                {grupoDe(nota)
                  ? `${grupoDe(nota)!.arquivado_em ? "▤ " : ""}${grupoDe(nota)!.emoji ? grupoDe(nota)!.emoji + " " : ""}${grupoDe(nota)!.nome}`
                  : "sem grupo"}{" "}
                ▾
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

            {expandida ? corpoLeitura : editando ? corpoEdicao : corpoLeitura}
            {conexoes}

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
            <p className="year-note">Crie a primeira nota com o botão “+ Nova” (atalho n) — uma ideia por nota, ligadas por [[links]].</p>
          </div>
        )}
      </div>

      {/* ── 12b: nota expandida em tela cheia — Esc volta.
             Portal no body: o .view-in tem transform (stagger) e prenderia o fixed ── */}
      {expandida &&
        nota &&
        createPortal(
        <div className="nota-cheia" role="dialog" aria-label="Nota expandida">
          <div className="ncx-head">
            <button className="esp-breadcrumb" onClick={() => setExpandida(false)}>
              ‹ Notas <kbd>Esc</kbd>
            </button>
            {indicadorSalvo}
            <div className="nv-acoes">
              <div className="seg" role="tablist" aria-label="Modo da nota">
                <button role="tab" className={editando ? "on" : ""} onClick={() => setEditando(true)}>
                  Editar
                </button>
                <button role="tab" className={editando ? "" : "on"} onClick={() => setEditando(false)}>
                  Leitura
                </button>
              </div>
              <button className="nv-btn" onClick={() => setExpandida(false)}>⇱ Recolher</button>
            </div>
          </div>
          <div className="ncx-scroll">
            <div className="ncx-col">
              <input
                className="ncx-titulo"
                value={nota.titulo}
                onChange={(e) => {
                  editarLocal(nota.id, { titulo: e.target.value });
                  agendarSalvar(nota.id, { titulo: e.target.value || "Sem título" });
                }}
              />
              <div className="ncx-chips">
                {grupoDe(nota) && (
                  <span className="nc-chip grupo">
                    {grupoDe(nota)!.kind === "projeto" ? "▶ " : "▣ "}
                    {grupoDe(nota)!.nome}
                  </span>
                )}
                {tagsDe(nota.md).map((t) => (
                  <span key={t} className="nc-chip wl">#{t}</span>
                ))}
                {pessoasDe(nota.md).map((p) => (
                  <span key={p} className="nc-chip at">@{p}</span>
                ))}
                <span className="ncx-quando">editada {dataCurta(nota.atualizada_em)}</span>
              </div>
              {editando ? corpoEdicao : corpoLeitura}
              {conexoes}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
