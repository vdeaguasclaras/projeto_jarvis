"use client";

/** Editor com markdown vivo (12a/8a): um <pre> colorido atrás e um textarea
 *  com texto transparente na frente, ambos com a MESMA métrica de fonte.
 *  O caret e a seleção são nativos do textarea; a cor vem do overlay
 *  (mdVivoHtml preserva o texto caractere a caractere). Rolagem sincronizada.
 *  Era o maior risco técnico do plano — este é o fallback recomendado, que
 *  funciona igual no teclado do celular. */

import { useRef, type MutableRefObject } from "react";
import { mdVivoHtml } from "@/lib/markdown";

type Props = {
  valor: string;
  placeholder?: string;
  /** ref externa do textarea (autocomplete de [[links]] e barra de formatação) */
  taRef?: MutableRefObject<HTMLTextAreaElement | null>;
  onMudar: (md: string) => void;
  /** clique/teclado — o NotesView recalcula o autocomplete pelo cursor */
  onCursor?: () => void;
  onEsc?: () => void;
};

export default function EditorVivo({ valor, placeholder, taRef, onMudar, onCursor, onEsc }: Props) {
  const hlRef = useRef<HTMLPreElement | null>(null);
  const meuRef = useRef<HTMLTextAreaElement | null>(null);

  const sincronizar = () => {
    const hl = hlRef.current;
    const ta = meuRef.current;
    if (hl && ta) {
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
    }
  };

  return (
    <div className="ev-wrap">
      <pre
        className="ev-hl"
        ref={hlRef}
        aria-hidden
        // ​: a última linha vazia precisa de conteúdo para ter altura
        dangerouslySetInnerHTML={{ __html: mdVivoHtml(valor) + "\n​" }}
      />
      <textarea
        className="ev-ta"
        ref={(el) => {
          meuRef.current = el;
          if (taRef) taRef.current = el;
        }}
        value={valor}
        spellCheck={false}
        placeholder={placeholder}
        onChange={(e) => {
          onMudar(e.target.value);
          requestAnimationFrame(sincronizar);
        }}
        onScroll={sincronizar}
        onClick={onCursor}
        onKeyUp={(e) => {
          if (e.key === "Escape") onEsc?.();
          else onCursor?.();
        }}
      />
    </div>
  );
}
