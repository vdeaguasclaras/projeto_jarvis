/** Ícones do redesign 2026-07 — SVGs recriados do canvas do handoff
 *  (traço 1.7–1.8, cantos arredondados). Cor via currentColor. */

type IconeProps = { tamanho?: number };

export function IconeHoje({ tamanho = 21 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 22 22" aria-hidden>
      <circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="11" cy="11" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function IconeAgenda({ tamanho = 21 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 22 22" aria-hidden>
      <rect x="3.5" y="4.5" width="15" height="13.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 9h15" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 3v3M14.5 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconeTarefas({ tamanho = 21 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 22 22" aria-hidden>
      <rect x="3.5" y="3.5" width="15" height="15" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 11.2l2.6 2.6 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconeEspacos({ tamanho = 21 }: IconeProps) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 22 22" aria-hidden>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="12" y="3.5" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.5" y="12" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="12" y="12" width="6.5" height="6.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function IconeMais({ tamanho = 24, cor = "var(--on-accent)" }: IconeProps & { cor?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke={cor} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
