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

// \b não funciona com acentos (amanhã, sábado…) — as bordas são explícitas
const DIAS_PALAVRAS =
  "hoje|amanhã|amanha|segunda|seg|terça|terca|ter|quarta|qua|quinta|qui|sexta|sex|sábado|sabado|sab|domingo|dom";
const DATE_RX = new RegExp(`(?:^|[\\s,])(${DIAS_PALAVRAS})(?:-feira)?(?=$|[\\s,.;!?])`, "i");
const DATEN_RX = /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/;
const DIA_RX = /\bdia\s+(\d{1,2})\b/i;
const TIME_RX = /\b(\d{1,2})h(\d{2})?\b/;
const PROJECT_RX = /(?:^|\s)#([\wÀ-ú-]+)/;
const AREA_RX = /(?:^|\s)\/([\wÀ-ú-]+)/;
const PEOPLE_RX = /@([\wÀ-ú-]+)/g;

/** Normaliza para comparação: minúsculas, sem acentos, hífens viram espaços. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Nome → token digitável na captura ("Mudança de sede" → "Mudança-de-sede"). */
export function tokenDe(nome: string): string {
  return nome.trim().replace(/\s+/g, "-");
}

// chaves na forma normalizada (sem acento) — é assim que a busca chega
const DIAS_SEMANA: Record<string, number> = {
  domingo: 0, dom: 0, segunda: 1, seg: 1, terca: 2, ter: 2, quarta: 3, qua: 3,
  quinta: 4, qui: 4, sexta: 5, sex: 5, sabado: 6, sab: 6,
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Converte a data reconhecida na captura ("sexta", "24/07", "dia 24", "hoje"…) em ISO. */
export function resolveDataCaptura(date: string | null): string | null {
  if (!date) return null;
  const d = new Date();
  const norm = normalizar(date);
  if (norm === "hoje") return iso(d);
  if (norm === "amanha" || norm === "amanhã") {
    d.setDate(d.getDate() + 1);
    return iso(d);
  }
  if (norm in DIAS_SEMANA) {
    const alvo = DIAS_SEMANA[norm];
    const delta = (alvo - d.getDay() + 7) % 7 || 7; // próxima ocorrência (nunca hoje)
    d.setDate(d.getDate() + delta);
    return iso(d);
  }
  const dia = norm.match(/^dia (\d{1,2})$/);
  if (dia) {
    const n = Number(dia[1]);
    const alvo = new Date(d.getFullYear(), d.getMonth(), n);
    if (alvo < d) alvo.setMonth(alvo.getMonth() + 1);
    return iso(alvo);
  }
  const num = norm.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (num) {
    const ano = num[3] ? (num[3].length === 2 ? 2000 + Number(num[3]) : Number(num[3])) : d.getFullYear();
    const alvo = new Date(ano, Number(num[2]) - 1, Number(num[1]));
    if (!num[3] && alvo < d) alvo.setFullYear(alvo.getFullYear() + 1);
    return iso(alvo);
  }
  return null;
}

/** Acha o container citado num token (#Projeto ou /Área): igual normalizado, ou prefixo único.
 *  Se nada bater no(s) tipo(s) preferido(s), tenta os demais — usar /Projeto ou #Área
 *  por engano não pode perder o vínculo. */
export function encontraContainer<T extends { nome: string; kind: string }>(
  token: string | null,
  lista: T[],
  kinds: string[],
): T | null {
  if (!token) return null;
  const alvo = normalizar(token);
  const busca = (cands: T[]): T | null => {
    const exato = cands.find((c) => normalizar(c.nome) === alvo);
    if (exato) return exato;
    const prefixo = cands.filter((c) => normalizar(c.nome).startsWith(alvo));
    return prefixo.length === 1 ? prefixo[0] : null;
  };
  return busca(lista.filter((c) => kinds.includes(c.kind))) ?? busca(lista.filter((c) => !kinds.includes(c.kind)));
}

export function parseCapture(raw: string): Capture {
  const v = raw.trim();
  const d = v.match(DATE_RX);
  const dn = v.match(DATEN_RX);
  const dd = v.match(DIA_RX);
  const t = v.match(TIME_RX);
  const proj = v.match(PROJECT_RX);
  const area = v.match(AREA_RX);
  const people = [...v.matchAll(PEOPLE_RX)].map((m) => m[1]);

  // Título persistente: os marcadores viram parte legível do texto (só o símbolo sai);
  // data e hora saem junto com a preposição órfã ("às", "no dia"…) para não sobrar
  // "Enviar a programação do por e-mail, às" (feedback do Raul).
  const title =
    v
      .replace(/(^|[^\wÀ-ú]),?\s*(?:(?:às|as|ás)\s+)?\d{1,2}h(?:\d{2})?(?=$|[^\w])/i, "$1")
      .replace(/(^|[^\wÀ-ú]),?\s*(?:(?:no|na|em|para|pra|até|ate)\s+)?dia\s+\d{1,2}(?=$|[^\w])/i, "$1")
      .replace(/(^|[^\wÀ-ú]),?\s*(?:(?:no|na|em|para|pra|até|ate)\s+)?\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?=$|[^\w/])/, "$1")
      .replace(
        new RegExp(`(^|[^\\wÀ-ú]),?\\s*(?:(?:nesta|nessa|na|no|em|para|pra|até|ate)\\s+)?(?:${DIAS_PALAVRAS})(?:-feira)?(?=$|[^\\wÀ-ú])`, "i"),
        "$1",
      )
      .replace(/(^|\s)#([\wÀ-ú-]+)/g, (_m, sp, tok) => sp + tok.replace(/-/g, " "))
      .replace(/(^|\s)\/([\wÀ-ú-]+)/g, (_m, sp, tok) => sp + tok.replace(/-/g, " "))
      .replace(/@([\wÀ-ú-]+)/g, (_m, tok) => tok.replace(/-/g, " "))
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;])/g, "$1")
      .replace(/^[\s,.;]+|[\s,.;]+$/g, "")
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
