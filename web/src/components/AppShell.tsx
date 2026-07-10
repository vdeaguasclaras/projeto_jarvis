"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import DayView from "@/components/DayView";
import ComingSoon from "@/components/ComingSoon";
import AuthBar from "@/components/AuthBar";
import { ROADMAP, VIEWS, type ViewId } from "@/lib/demo";
import { parseCapture } from "@/lib/parser";
import { supabase } from "@/lib/supabase";

const TITLES: Record<ViewId, [string, string]> = {
  dia: ["Hoje", "o dia é o ponto de entrada"],
  semana: ["Semana", "em construção — Marco 5"],
  mes: ["Mês", "em construção — Marco 5"],
  ano: ["Ano", "em construção — Marco 5"],
  tarefas: ["Tarefas", "em construção — Marco 4"],
  grafo: ["Grafo", "chega na Fase 3"],
  notas: ["Notas", "chega na Fase 3"],
};

const DEMO_INBOX = [
  "Ideia: oficina de escrita para a equipe",
  "Proposta do fornecedor de mobiliário",
  "Ligar para a escola sobre a matrícula",
];

export default function AppShell() {
  const [view, setView] = useState<ViewId>("dia");
  const [collapsed, setCollapsed] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [inbox, setInbox] = useState<string[]>(DEMO_INBOX);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Sessão (link mágico persiste no navegador; RLS isola os dados por usuário)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Inbox real (kairos_inbox) quando logado; demo quando não
  const loadInbox = useCallback(async () => {
    if (!supabase || !session) return;
    const { data, error } = await supabase
      .from("kairos_inbox")
      .select("texto")
      .is("triado_em", null)
      .order("criado_em");
    if (!error && data) setInbox(data.map((r: { texto: string }) => r.texto));
  }, [session]);

  useEffect(() => {
    if (session) {
      loadInbox();
    } else {
      setInbox(DEMO_INBOX);
    }
  }, [session, loadInbox]);

  const capture = useCallback(
    async (text: string) => {
      const c = parseCapture(text);
      if (supabase && session) {
        const { error } = await supabase
          .from("kairos_inbox")
          .insert({ user_id: session.user.id, texto: text.trim() });
        if (error) {
          showToast(`Erro ao salvar: ${error.message}`);
          return;
        }
        await loadInbox();
        showToast(`Capturado: "${c.title.slice(0, 48)}" → Inbox (salvo na nuvem ✓)`);
      } else {
        setInbox((prev) => [...prev, c.title]);
        showToast(`Capturado: "${c.title.slice(0, 48)}" → Inbox (só nesta aba — entre para salvar)`);
      }
    },
    [session, showToast, loadInbox],
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    showToast("Você saiu — de volta ao modo demonstração");
  }, [showToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const match = VIEWS.find((v) => v.key === e.key);
      if (match) setView(match.id);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`app${collapsed ? " nosb" : ""}`}>
      <Sidebar
        inboxCount={inbox.length}
        activeToday={view === "dia"}
        userEmail={session?.user.email ?? null}
        onToday={() => setView("dia")}
        onLogout={logout}
        onSoon={(what) => showToast(`${what} — em construção nesta fase`)}
      />
      <main className="main">
        <Topbar
          view={view}
          title={TITLES[view]}
          onView={setView}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onCapture={capture}
        />
        <div className="canvas">
          {!session && <AuthBar onToast={showToast} />}
          {view === "dia" ? (
            <DayView key="dia" inboxCount={inbox.length} onToast={showToast} />
          ) : (
            <ComingSoon key={view} title={TITLES[view][0]} info={ROADMAP[view]} />
          )}
        </div>
      </main>
      <nav className="bottomnav" aria-label="Navegação">
        {[
          ["dia", "◉", "Hoje"],
          ["projetos", "▶", "Projetos"],
          ["areas", "▣", "Áreas"],
          ["recursos", "◈", "Recursos"],
          ["arquivo", "▤", "Arquivo"],
        ].map(([id, ico, label]) => (
          <button
            key={id}
            className={id === "dia" && view === "dia" ? "active" : ""}
            onClick={() =>
              id === "dia" ? setView("dia") : showToast(`${label} — em construção nesta fase`)
            }
          >
            <span className="ico">{ico}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className={`toast${toast ? " show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
