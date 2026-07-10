/**
 * Teste de ponta a ponta da camada de dados (RLS ativo, usuário de teste).
 * Uso: node scripts/e2e-db.mjs  (lê NEXT_PUBLIC_SUPABASE_* de .env.local)
 * Exercita: capturar → triar (tarefa/nota/incubar) → concluir → ritual/placar.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const EMAIL = "kairos-teste@example.com";
const SENHA = "senha-teste-kairos-123";
const hoje = new Date().toISOString().slice(0, 10);
let falhas = 0;
const ok = (nome, cond, extra = "") => {
  console.log(`${cond ? "✓" : "✗ FALHOU"} ${nome}${extra ? " — " + extra : ""}`);
  if (!cond) falhas++;
};

// 1. Login com senha (usuário de teste criado via SQL)
const { data: auth, error: eAuth } = await sb.auth.signInWithPassword({ email: EMAIL, password: SENHA });
ok("login", !eAuth && !!auth.session, eAuth?.message);
if (eAuth) process.exit(1);
const uid = auth.user.id;

// 2. Capturar → Inbox
const { error: e1 } = await sb.from("kairos_inbox").insert({ user_id: uid, texto: "testar parecer dia 24 @Ana" });
ok("capturar", !e1, e1?.message);
const { data: inbox } = await sb.from("kairos_inbox").select("id, texto").is("triado_em", null)
  .or(`incubada_ate.is.null,incubada_ate.lte.${hoje}`).order("criado_em");
ok("listar inbox", inbox?.length === 1);

// 3. Criar container e triar como tarefa planejada
const { data: cont, error: e2 } = await sb.from("kairos_containers")
  .insert({ user_id: uid, kind: "projeto", nome: "Projeto de teste" }).select("id, kind, nome").single();
ok("criar projeto", !e2, e2?.message);
const { error: e3 } = await sb.from("kairos_tarefas").insert({
  user_id: uid, titulo: "testar parecer", status: "a_fazer", prazo: hoje, container_id: cont.id,
});
ok("criar tarefa", !e3, e3?.message);
await sb.from("kairos_inbox").update({ triado_em: new Date().toISOString() }).eq("id", inbox[0].id);
const { data: inbox2 } = await sb.from("kairos_inbox").select("id").is("triado_em", null);
ok("inbox zero após triagem", inbox2?.length === 0);

// 4. Delegar (pessoa + em_espera) e referência (nota)
const { data: pessoa } = await sb.from("kairos_pessoas").insert({ user_id: uid, nome: "Ana" }).select("id").single();
const { error: e4 } = await sb.from("kairos_tarefas").insert({
  user_id: uid, titulo: "proposta do fornecedor", status: "em_espera", responsavel_id: pessoa.id,
});
ok("delegar", !e4, e4?.message);
const { error: e5 } = await sb.from("kairos_notas").insert({ user_id: uid, titulo: "Ideia de teste", md: "conteúdo", container_id: null });
ok("guardar nota", !e5, e5?.message);

// 5. Incubação
const { data: inc } = await sb.from("kairos_inbox")
  .insert({ user_id: uid, texto: "ideia incubada" }).select("id").single();
await sb.from("kairos_inbox").update({ incubada_ate: "2099-01-01" }).eq("id", inc.id);
const { data: inbox3 } = await sb.from("kairos_inbox").select("id").is("triado_em", null)
  .or(`incubada_ate.is.null,incubada_ate.lte.${hoje}`);
ok("incubada some da inbox", inbox3?.length === 0);

// 6. Concluir tarefa + placar
const { data: tarefas } = await sb.from("kairos_tarefas").select("id, status").eq("status", "a_fazer");
await sb.from("kairos_tarefas").update({ status: "concluida", concluida_em: new Date().toISOString() }).eq("id", tarefas[0].id);
const { data: feitas } = await sb.from("kairos_tarefas").select("id").eq("status", "concluida");
ok("concluir tarefa", feitas?.length === 1);
const { error: e6 } = await sb.from("kairos_rituais")
  .upsert({ user_id: uid, tipo: "check_dia", data: hoje, placar: { triados: 1 } }, { onConflict: "user_id,tipo,data" });
ok("registrar ritual", !e6, e6?.message);
const { error: e7 } = await sb.from("kairos_rituais")
  .upsert({ user_id: uid, tipo: "check_dia", data: hoje, placar: { triados: 2 } }, { onConflict: "user_id,tipo,data" });
ok("ritual idempotente (upsert)", !e7, e7?.message);

// 7. RLS: as tabelas jim_* do outro app não podem vazar dados para este usuário
const { data: jim } = await sb.from("jim_config").select("*");
ok("RLS isola app vizinho (jim_config vazio ou negado)", !jim || jim.length === 0);

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo passou ✓");
process.exit(falhas ? 1 : 0);
