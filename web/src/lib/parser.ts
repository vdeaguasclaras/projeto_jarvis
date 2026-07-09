/**
 * Parser da captura rápida — a mesma gramática validada nos protótipos:
 *   @pessoa  #projeto  /área
 *   datas: "sexta", "amanhã", "24/07", "24/07/2026", "dia 24"
 *   hora: "14h", "14h30"
 */
export type Capture = {
  title: string;
  date: string | null;
  time: string | null;
  project: string | null;
  area: string | null;
  people: string[];
};

const DATE_RX =
  /\b(hoje|amanhã|segunda|seg|terça|ter|quarta|qua|quinta|qui|sexta|sex|sábado|sab|domingo|dom)\b/i;
const DATEN_RX = /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/;
const DIA_RX = /\bdia\s+(\d{1,2})\b/i;
const TIME_RX = /\b(\d{1,2})h(\d{2})?\b/;
const PROJECT_RX = /(?:^|\s)#([\wÀ-ú-]+)/;
const AREA_RX = /(?:^|\s)\/([\wÀ-ú-]+)/;
const PEOPLE_RX = /@([\wÀ-ú]+)/g;

export function parseCapture(raw: string): Capture {
  const v = raw.trim();
  const d = v.match(DATE_RX);
  const dn = v.match(DATEN_RX);
  const dd = v.match(DIA_RX);
  const t = v.match(TIME_RX);
  const proj = v.match(PROJECT_RX);
  const area = v.match(AREA_RX);
  const people = [...v.matchAll(PEOPLE_RX)].map((m) => m[1]);

  const title =
    v
      .replace(DATE_RX, "")
      .replace(DIA_RX, "")
      .replace(DATEN_RX, "")
      .replace(TIME_RX, "")
      .replace(/(?:^|\s)#[\wÀ-ú-]+/g, "")
      .replace(/(?:^|\s)\/[\wÀ-ú-]+/g, "")
      .replace(/@[\wÀ-ú]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim() || "Nova captura";

  return {
    title,
    date: d ? d[1].toLowerCase() : dn ? dn[1] : dd ? `dia ${dd[1]}` : null,
    time: t ? `${t[1]}h${t[2] ?? ""}` : null,
    project: proj ? proj[1] : null,
    area: area ? area[1] : null,
    people,
  };
}
