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
  | { ok: true; importados: number; removidos: number }
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

  const url =
    "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
    `?timeMin=${encodeURIComponent(de.toISOString())}` +
    `&timeMax=${encodeURIComponent(ate.toISOString())}` +
    "&singleEvents=true&orderBy=startTime&maxResults=250";

  let resp: Response;
  try {
    resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    return { ok: false, motivo: "erro", detalhe: String(e) };
  }
  if (resp.status === 401) return { ok: false, motivo: "expirado" };
  if (resp.status === 403) return { ok: false, motivo: "api_desligada" };
  if (!resp.ok) return { ok: false, motivo: "erro", detalhe: `HTTP ${resp.status}` };

  const json = (await resp.json()) as { items?: GEvento[] };
  // Só eventos com horário (dia inteiro fica para depois — não polui a grade)
  const eventos = (json.items ?? []).filter(
    (e) => e.status !== "cancelled" && e.id && e.start?.dateTime && e.end?.dateTime,
  );

  if (eventos.length) {
    const { error } = await supabase.from("kairos_eventos").upsert(
      eventos.map((e) => ({
        user_id: userId,
        titulo: e.summary?.trim() || "(sem título)",
        inicio: e.start!.dateTime!,
        fim: e.end!.dateTime!,
        origem: "google",
        google_id: e.id,
      })),
      { onConflict: "user_id,google_id" },
    );
    if (error) return { ok: false, motivo: "erro", detalhe: error.message };
  }

  // Remove da janela os espelhos cujo evento sumiu (cancelado/movido) no Google
  let del = supabase
    .from("kairos_eventos")
    .delete({ count: "exact" })
    .eq("origem", "google")
    .gte("inicio", de.toISOString())
    .lt("inicio", ate.toISOString());
  if (eventos.length) {
    del = del.not("google_id", "in", `(${eventos.map((e) => `"${e.id}"`).join(",")})`);
  }
  const { count, error: errDel } = await del;
  if (errDel) return { ok: false, motivo: "erro", detalhe: errDel.message };

  return { ok: true, importados: eventos.length, removidos: count ?? 0 };
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
