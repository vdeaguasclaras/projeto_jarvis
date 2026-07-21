/** Tema claro/escuro/seguir o sistema (redesign 2026-07).
 *  "sistema" = sem data-theme (o CSS segue prefers-color-scheme);
 *  a escolha explícita vive no localStorage e é reaplicada pelo
 *  script inline do layout antes da primeira pintura (sem flash). */

export type TemaPref = "sistema" | "claro" | "escuro";

const CHAVE = "kairos.tema";

export function temaPref(): TemaPref {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === "claro" || v === "escuro" ? v : "sistema";
  } catch {
    return "sistema";
  }
}

export function aplicarTema(pref: TemaPref) {
  const root = document.documentElement;
  if (pref === "sistema") delete root.dataset.theme;
  else root.dataset.theme = pref === "claro" ? "light" : "dark";
  try {
    if (pref === "sistema") localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, pref);
  } catch {
    /* sem localStorage */
  }
}

export function proximoTema(pref: TemaPref): TemaPref {
  return pref === "sistema" ? "escuro" : pref === "escuro" ? "claro" : "sistema";
}

export const ROTULO_TEMA: Record<TemaPref, string> = {
  sistema: "seguir o sistema",
  claro: "claro",
  escuro: "escuro",
};
