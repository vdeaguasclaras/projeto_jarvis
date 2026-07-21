/** Cores por projeto/área (redesign 2026-07): eventos da timeline, chips e
 *  nós ganham a cor do container. Enquanto a coluna `cor` não existe no banco,
 *  a cor sai desta paleta de tokens, escolhida de forma estável pelo id —
 *  o mesmo container tem sempre a mesma cor, nos dois temas. */

export type CorContainer = { borda: string; fundo: string; texto: string };

const PALETA: CorContainer[] = [
  { borda: "var(--green)", fundo: "var(--green-event)", texto: "var(--green-event-ink)" },
  { borda: "var(--terracotta)", fundo: "var(--terracotta-event)", texto: "var(--terracotta-deep)" },
  { borda: "var(--purple-border)", fundo: "var(--purple-bg)", texto: "var(--purple-deep)" },
  { borda: "#c07a4f", fundo: "color-mix(in srgb, #c07a4f 16%, var(--surface))", texto: "var(--ink-secondary)" },
];

export function corDoContainer(id: string | null): CorContainer | null {
  if (!id) return null;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}
