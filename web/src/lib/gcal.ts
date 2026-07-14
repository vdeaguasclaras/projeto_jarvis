import { supabase } from "./supabase";

/** Fase 2 — sync do Google Calendar (sem backend próprio).
 *
 *  O login com Google pede o escopo calendar.readonly; o Supabase devolve o
 *  provider_token na sessão e o app chama a API do Google direto do navegador.
 *  Os eventos entram em kairos_eventos com origem 'google' + google_id
 *  (idempotente: upsert por usuário+google_id; os que somem da janela são
 *  removidos). O Google continua sendo a fonte da verdade — aqui é espelho.
 *
 *  Limite conhecido: o provider_token vale ~1h após o login e o Supabase não
 *  o renova sozinho; expirou, o app pede para entrar com Google de novo. */

export type ResultadoSync =
  | { ok: true; importados: number; removidos: number; agendas: number }
  | { ok: false; motivo: "sem_token" | "expirado" | "api_desligada" | "erro"; detalhe?: string };

const JANELA_ANTES_DIAS = 7;
const JANELA_DEPOIS_DIAS = 60;

type GEvento = {
  id: string;
  status?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type GAgenda = { id: string; summary?: string; selected?: boolean };

async function gFetch(token: string, url: string): Promise<{ ok: true; json: unknown } | { ok: false; r: ResultadoSync }> {
  let resp: Response;
  try {
    resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    return { ok: false, r: { ok: false, motivo: "erro", detalhe: String(e) } };
  }
  if (resp.status === 401) return { ok: false, r: { ok: false, motivo: "expirado" } };
  if (resp.status === 403) return { ok: false, r: { ok: false, motivo: "api_desligada" } };
  if (!resp.ok) return { ok: false, r: { ok: false, motivo: "erro", detalhe: `HTTP ${resp.status}` } };
  return { ok: true, json: await resp.json() };
}

/** Importa TODAS as agendas visíveis da conta (ex.: pessoal + "Marista"),
 *  não só a principal. google_id = "agenda/evento" para não colidir. */
export async function sincronizarGoogleAgenda(userId: string): Promise<ResultadoSync> {
  if (!supabase) return { ok: false, motivo: "erro", detalhe: "sem banco" };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.provider_token;
  if (!token) return { ok: false, motivo: "sem_token" };

  const de = new Date();
  de.setDate(de.getDate() - JANELA_ANTES_DIAS);
  de.setHours(0, 0, 0, 0);
  const ate = new Date();
  ate.setDate(ate.getDate() + JANELA_DEPOIS_DIAS);

  // 1 · todas as agendas da conta (as marcadas como visíveis no Google)
  const rCal = await gFetch(token, "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50");
  if (!rCal.ok) return rCal.r;
  const agendas = ((rCal.json as { items?: GAgenda[] }).items ?? []).filter((c) => c.id && c.selected !== false);

  // 2 · eventos de cada agenda na janela (só os com horário — dia inteiro fica para depois)
  const linhas: { user_id: string; titulo: string; inicio: string; fim: string; origem: string; google_id: string }[] = [];
  for (const cal of agendas) {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events` +
      `?timeMin=${encodeURIComponent(de.toISOString())}` +
      `&timeMax=${encodeURIComponent(ate.toISOString())}` +
      "&singleEvents=true&orderBy=startTime&maxResults=250";
    const r = await gFetch(token, url);
    if (!r.ok) return r.r;
    for (const e of (r.json as { items?: GEvento[] }).items ?? []) {
      if (e.status === "cancelled" || !e.id || !e.start?.dateTime || !e.end?.dateTime) continue;
      linhas.push({
        user_id: userId,
        titulo: e.summary?.trim() || "(sem título)",
        inicio: e.start.dateTime,
        fim: e.end.dateTime,
        origem: "google",
        google_id: `${cal.id}/${e.id}`,
      });
    }
  }

  // 3 · espelho idempotente
  if (linhas.length) {
    const { error } = await supabase.from("kairos_eventos").upsert(linhas, { onConflict: "user_id,google_id" });
    if (error) return { ok: false, motivo: "erro", detalhe: error.message };
  }

  // 4 · remove da janela os espelhos cujo evento sumiu no Google
  //     (inclui os google_id no formato antigo, sem o prefixo da agenda)
  let del = supabase
    .from("kairos_eventos")
    .delete({ count: "exact" })
    .eq("origem", "google")
    .gte("inicio", de.toISOString())
    .lt("inicio", ate.toISOString());
  if (linhas.length) {
    del = del.not("google_id", "in", `(${linhas.map((l) => `"${l.google_id}"`).join(",")})`);
  }
  const { count, error: errDel } = await del;
  if (errDel) return { ok: false, motivo: "erro", detalhe: errDel.message };

  return { ok: true, importados: linhas.length, removidos: count ?? 0, agendas: agendas.length };
}

/** Entrar com Google já pedindo o escopo da agenda (Marco 2 + Fase 2). */
export async function entrarComGoogle(): Promise<string | null> {
  if (!supabase) return "sem banco";
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      scopes: "https://www.googleapis.com/auth/calendar.readonly",
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  return error ? error.message : null;
}
