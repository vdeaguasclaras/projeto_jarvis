import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cliente Supabase (null → app roda em modo demonstração, sem persistência).
 * A chave anon é pública por design; a segurança vem do RLS (cada linha
 * pertence ao seu usuário — ver supabase/migrations/0001).
 */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;
