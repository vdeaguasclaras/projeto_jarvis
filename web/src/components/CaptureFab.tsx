"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizar, parseCapture, tokenDe } from "@/lib/parser";
import type { Container, Pessoa } from "@/lib/db";

/** Captura em destaque (proposta C escolhida pelo Raul): botão flutuante no
 *  canto que abre um compositor — texto com os marcadores de sempre, prévia
 *  do parse, autocompletar e IMAGEM (colar, arrastar ou escolher arquivo).
 *  Atalho: c abre · Enter captura · Esc fecha. */

type Sugestao = { insere: string; mostra: string; tipo: string };

type Props = {
  logged: boolean;
  containers: Container[];
  pessoas: Pessoa[];
  onCapture: (texto: string, imagem: File | null) => Promise<void> | void;
  onToast: (msg: string) => void;
};

export default function CaptureFab({ logged, containers, pessoas, onCapture, onToast }: Props) {
  const [aberto, setAberto] = useState(false);
  const [text, setText] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => (text.trim() ? parseCapture(text) : null), [text]);

  // prévia local da imagem anexada
  useEffect(() => {
    if (!imagem) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(imagem);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imagem]);

  // atalho global: "c" abre o compositor
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      await onCapture(text.trim() || "Imagem capturada", imagem);
      setText("");
      setImagem(null);
      fechar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {aberto && <div className="scrim show" style={{ background: "transparent", backdropFilter: "none" }} onClick={fechar} />}
      <div
        className={`compositor${aberto ? " aberto" : ""}`}
        role="dialog"
        aria-label="Capturar"
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          anexar(e.dataTransfer.files?.[0]);
        }}
      >
        <textarea
          ref={taRef}
          value={text}
          rows={2}
          placeholder="Capturar… ex.: revisar edital dia 24 14h @Ana #Sede"
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const f = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"))?.getAsFile();
            if (f) {
              e.preventDefault();
              anexar(f);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab" && ac) {
              e.preventDefault();
              completar(ac.itens[0]);
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") fechar();
          }}
        />
        {parsed && (
          <div className="comp-parse">
            <span className="chip muted">{parsed.title}</span>
            {parsed.date && <span className="chip">📅 {parsed.date}</span>}
            {parsed.time && <span className="chip">🕐 {parsed.time}</span>}
            {parsed.people.map((p) => (
              <span key={p} className="chip person">
                @{p.replace(/-/g, " ")}
              </span>
            ))}
            {parsed.project && <span className="chip">▶ {parsed.project.replace(/-/g, " ")}</span>}
            {parsed.area && <span className="chip">▣ {parsed.area.replace(/-/g, " ")}</span>}
            {!parsed.project && !parsed.area && !parsed.date && <span className="chip muted">→ Inbox</span>}
          </div>
        )}
        {ac && (
          <div className="ac-list" style={{ marginBottom: 8 }}>
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
        {preview ? (
          <div className="comp-anexo com-img">
            {/* prévia local do anexo — a imagem sobe no capturar */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Imagem anexada" />
            <button onClick={() => setImagem(null)} aria-label="Tirar a imagem">
              ✕ tirar
            </button>
          </div>
        ) : (
          <button className="comp-anexo" onClick={() => fileRef.current?.click()}>
            🖼 <b>Colar (Ctrl+V)</b>, arrastar ou <u>escolher</u> uma imagem — print, foto do quadro…
          </button>
        )}
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
        <div className="comp-acoes">
          <span className="capture-hint" style={{ margin: 0, flex: 1 }}>
            {ac ? "Tab completa a sugestão" : "Enter captura · Esc fecha"}
          </span>
          <button className="btn ghost" onClick={fechar}>
            Fechar
          </button>
          <button className="btn primary" onClick={submit} disabled={enviando || (!text.trim() && !imagem)}>
            {enviando ? "Capturando…" : "Capturar ⏎"}
          </button>
        </div>
        {arrastando && <div className="comp-drop">solte a imagem aqui</div>}
      </div>
      <button
        className="fab"
        aria-label="Capturar (atalho: c)"
        title="Capturar (atalho: c)"
        onClick={() => {
          setAberto((v) => !v);
          if (!aberto) requestAnimationFrame(() => taRef.current?.focus());
        }}
      >
        +<kbd>c</kbd>
      </button>
    </>
  );
}
