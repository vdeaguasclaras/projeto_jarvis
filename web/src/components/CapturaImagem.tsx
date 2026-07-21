"use client";

import { useEffect, useState } from "react";
import { urlDaImagem } from "@/lib/db";

/** Exibe a imagem de uma captura (bucket privado — URL assinada de 1h). */
export default function CapturaImagem({ path, alt = "Imagem da captura" }: { path: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    urlDaImagem(path).then((u) => vivo && setUrl(u));
    return () => {
      vivo = false;
    };
  }, [path]);
  if (!url) return <div className="cap-img carregando">🖼 carregando…</div>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="cap-img" title="Abrir a imagem inteira">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} />
    </a>
  );
}
