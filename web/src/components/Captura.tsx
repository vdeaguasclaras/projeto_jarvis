"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { encontraContainer, normalizar, parseCapture, resolveDataCaptura, tokenDe } from "@/lib/parser";
import type { Container, Pessoa } from "@/lib/db";

/** Captura como paleta de comando (redesign 10b): ⌘K ou + abrem uma paleta
 *  central com tabs Tarefa/Nota/Evento. Tab alterna o tipo (quando não há
 *  autocomplete aberto), ⏎ cria, Esc fecha. A gramática é a de sempre
 *  (@pessoa #projeto /área, datas) exibida como chips em tempo real. */

export type TipoCaptura = "tarefa" | "nota" | "evento";

const TABS: { id: TipoCaptura; rotulo: string }[] = [
  { id: "tarefa", rotulo: "☑ Tarefa" },
  { id: "nota", rotulo: "✎ Nota" },
  { id: "evento", rotulo: "🗓 Evento" },
];

type Sugestao = { insere: string; mostra: string; tipo: string };

type Props = {
  logged: boolean;
  /** incrementa para abrir de fora (o + do trilho/tab bar) */
  abrirSinal: number;
  /** tab pedida pelo leque do celular na última abertura */
  tabInicial: TipoCaptura;
  containers: Container[];
  pessoas: Pessoa[];
  onCriar: (tipo: TipoCaptura, texto: string, imagem: File | null) => Promise<void> | void;
  onToast: (msg: string) => void;
};

export default function Captura({ logged, abrirSinal, tabInicial, containers, pessoas, onCriar, onToast }: Props) {
  const [aberto, setAberto] = useState(false);
  const [tab, setTab] = useState<TipoCaptura>("tarefa");
  const [text, setText] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => (text.trim() ? parseCapture(text) : null), [text]);

  useEffect(() => {
    if (!imagem) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(imagem);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imagem]);

  // o + do trilho/tab bar (e o leque do celular) abrem com a tab pedida
  useEffect(() => {
    if (abrirSinal > 0) {
      setTab(tabInicial);
      setAberto(true);
      requestAnimationFrame(() => taRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirSinal]);

  // atalhos globais: ⌘K (ou Ctrl+K) e "c" abrem a paleta
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto(true);
        requestAnimationFrame(() => taRef.current?.focus());
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setAberto(true);
        requestAnimationFrame(() => taRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Autocompletar: sugestões para o token em digitação (@pessoa, #projeto, /área)
  const ac = useMemo(() => {
    const m = text.match(/(^|\s)([@#\/])([\wÀ-ú-]*)$/);
    if (!m) return null;
    const [, , trigger, partial] = m;
    const alvo = normalizar(partial);
    let cands: Sugestao[] = [];
    if (trigger === "@") {
      cands = pessoas
        .filter((p) => normalizar(p.nome).startsWith(alvo))
        .map((p) => ({ insere: tokenDe(p.nome), mostra: p.nome, tipo: "pessoa" }));
    } else {
      const kind = trigger === "#" ? "projeto" : "area";
      cands = containers
        .filter((c) => c.kind === kind && (alvo === "" || normalizar(c.nome).includes(alvo)))
        .map((c) => ({ insere: tokenDe(c.nome), mostra: `${c.emoji ? c.emoji + " " : ""}${c.nome}`, tipo: kind === "area" ? "área" : kind }));
    }
    if (!cands.length) return null;
    return { start: m.index! + m[1].length, trigger, itens: cands.slice(0, 4) };
  }, [text, containers, pessoas]);

  const completar = (s: Sugestao) => {
    if (!ac) return;
    setText(text.slice(0, ac.start) + ac.trigger + s.insere + " ");
    taRef.current?.focus();
  };

  const anexar = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      onToast("Só imagens por enquanto (print, foto)");
      return;
    }
    if (!logged) {
      onToast("Entre com seu e-mail para anexar imagem à captura");
      return;
    }
    setImagem(f);
  };

  const fechar = () => {
    setAberto(false);
    setArrastando(false);
  };

  const submit = async () => {
    if ((!text.trim() && !imagem) || enviando) return;
    setEnviando(true);
    try {
      await onCriar(tab, text.trim() || "Imagem capturada", tab === "tarefa" ? imagem : null);
      setText("");
      setImagem(null);
      fechar();
    } finally {
      setEnviando(false);
    }
  };

  // ── Rodapé dinâmico: o que o ⏎ vai fazer, por tab ──
  const alvo = parsed
    ? (encontraContainer(parsed.project, containers, ["projeto"]) ?? encontraContainer(parsed.area, containers, ["area"]))
    : null;
  const prazo = parsed ? resolveDataCaptura(parsed.date) : null;
  const rotuloEnter =
    tab === "tarefa"
      ? alvo
        ? `criar em ${alvo.nome}`
        : prazo
          ? `criar p/ ${prazo.split("-").reverse().slice(0, 2).join("/")}`
          : "→ Inbox"
      : tab === "nota"
        ? alvo
          ? `criar a nota em ${alvo.nome}`
          : "criar e abrir a nota"
        : parsed?.time
          ? `criar às ${parsed.time.replace("h", ":").padEnd(5, "0")}`
          : "criar (dia inteiro)";
  const dica =
    tab === "tarefa"
      ? <>Com <b>#projeto</b> vira tarefa direto, sem Inbox</>
      : tab === "nota"
        ? <>A primeira linha vira o título · conecte com <b>[[links]]</b> no editor</>
        : <>Sem hora marcada, vira evento de <b>dia inteiro</b></>;

  if (!aberto) return null;

  return (
    <>
      <div className="cap-scrim" onClick={fechar} />
      <div
        className="paleta"
        role="dialog"
        aria-label="Capturar"
        onDragOver={(e) => {
          e.preventDefault();
          if (tab === "tarefa") setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (tab === "tarefa") anexar(e.dataTransfer.files?.[0]);
        }}
      >
        <div className="paleta-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`paleta-tab${tab === t.id ? " on" : ""}`} onClick={() => { setTab(t.id); taRef.current?.focus(); }}>
              {t.rotulo}
            </button>
          ))}
          <span className="paleta-hint">Tab alterna</span>
        </div>
        <div className="paleta-linha">
          <span className="paleta-mais">+</span>
          <textarea
            ref={taRef}
            value={text}
            rows={1}
            placeholder={
              tab === "tarefa"
                ? "revisar edital dia 24 14h @Ana #Sede…"
                : tab === "nota"
                  ? "título da nota #projeto…"
                  : "almoço com a Ana sexta 12h…"
            }
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              if (tab !== "tarefa") return;
              const f = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"))?.getAsFile();
              if (f) {
                e.preventDefault();
                anexar(f);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                // com autocomplete aberto o Tab completa; sem, alterna o tipo
                if (ac) {
                  completar(ac.itens[0]);
                  return;
                }
                const i = TABS.findIndex((t) => t.id === tab);
                setTab(TABS[(i + (e.shiftKey ? TABS.length - 1 : 1)) % TABS.length].id);
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") fechar();
            }}
          />
        </div>
        {parsed && (
          <div className="paleta-chips">
            <span className="chip muted">{parsed.title}</span>
            {parsed.date && <span className="chip">📅 {parsed.date}</span>}
            {parsed.time && <span className="chip">🕐 {parsed.time}</span>}
            {parsed.people.map((x) => (
              <span key={x} className="chip person">
                @{x.replace(/-/g, " ")}
              </span>
            ))}
            {parsed.project && <span className="chip">▶ {parsed.project.replace(/-/g, " ")}</span>}
            {parsed.area && <span className="chip">▣ {parsed.area.replace(/-/g, " ")}</span>}
            {tab === "tarefa" && !parsed.project && !parsed.area && !parsed.date && <span className="chip muted">→ Inbox</span>}
          </div>
        )}
        {ac && (
          <div className="ac-list paleta-ac">
            {ac.itens.map((s, i) => (
              <button
                key={s.insere}
                className={`ac-item${i === 0 ? " sel" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  completar(s);
                }}
              >
                {ac.trigger}
                {s.mostra}
                <span className="k">{s.tipo}</span>
              </button>
            ))}
          </div>
        )}
        {tab === "tarefa" &&
          (preview ? (
            <div className="paleta-anexo com-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Imagem anexada" />
              <button onClick={() => setImagem(null)} aria-label="Tirar a imagem">
                ✕ tirar
              </button>
            </div>
          ) : (
            <button className="paleta-anexo" onClick={() => fileRef.current?.click()}>
              🖼 colar (Ctrl+V), arrastar ou <u>escolher</u> uma imagem
            </button>
          ))}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            anexar(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="paleta-foot">
          <span className="paleta-dica">{ac ? "Tab completa a sugestão" : dica}</span>
          <span className="paleta-kbd">
            <kbd>⏎</kbd> {enviando ? "criando…" : rotuloEnter}
          </span>
          <span className="paleta-kbd">
            <kbd>esc</kbd> fechar
          </span>
        </div>
        {arrastando && <div className="comp-drop">solte a imagem aqui</div>}
      </div>
    </>
  );
}
