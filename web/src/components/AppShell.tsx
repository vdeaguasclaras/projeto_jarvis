"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import DayView from "@/components/DayView";
import ComingSoon from "@/components/ComingSoon";
import AuthBar from "@/components/AuthBar";
import TasksView from "@/components/TasksView";
import TriageModal from "@/components/TriageModal";
import NewContainerModal from "@/components/NewContainerModal";
import { ROADMAP, VIEWS, type ViewId } from "@/lib/demo";
import { parseCapture } from "@/lib/parser";
import { supabase } from "@/lib/supabase";
import {
  capturar,
  createContainer,
  hojeISO,
  listContainers,
  listInbox,
  listTarefas,
  mudarStatusTarefa,
  sequenciaCheck,
  type Container,
  type InboxItem,
  type Kind,
  type Tarefa,
} from "@/lib/db";

const TITLES: Record<ViewId, [string, string]> = {
  dia: ["Hoje", "o dia é o ponto de entrada"],
  semana: ["Semana", "em construção — Marco 5"],
  mes: ["Mês", "em construção — Marco 5"],
  ano: ["Ano", "em construção — Marco 5"],
  tarefas: ["Tarefas", "capturar → organizar → fazer"],
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
  const [demoInbox, setDemoInbox] = useState<string[]>(DEMO_INBOX);
  const [containers, setContainers] = useState<Container[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [seq, setSeq] = useState(0);
  const [triaging, setTriaging] = useState(false);
  const [newKind, setNewKind] = useState<Kind | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    const [cs, inb, ts, sq] = await Promise.all([listContainers(), listInbox(), listTarefas(), sequenciaCheck()]);
    setContainers(cs);
    setInboxItems(inb);
    setTarefas(ts);
    setSeq(sq);
  }, [session]);

  useEffect(() => {
    if (session) {
      refresh();
    } else {
      setContainers([]);
      setInboxItems([]);
      setTarefas([]);
      setSeq(0);
      setTriaging(false);
    }
  }, [session, refresh]);

  const capture = useCallback(
    async (text: string) => {
      const c = parseCapture(text);
      if (session) {
        const err = await capturar(session.user.id, text.trim());
        if (err) {
          showToast(`Erro ao salvar: ${err}`);
          return;
        }
        setInboxItems(await listInbox());
        showToast(`Capturado: "${c.title.slice(0, 48)}" → Inbox ✓`);
      } else {
        setDemoInbox((prev) => [...prev, c.title]);
        showToast(`Capturado: "${c.title.slice(0, 48)}" (só nesta aba — entre para salvar)`);
      }
    },
    [session, showToast],
  );

  const openTriage = useCallback(() => {
    if (!session) {
      showToast("Entre com seu e-mail para triar a Inbox de verdade");
      return;
    }
    if (!inboxItems.length) {
      showToast("Inbox zero — nada para triar 🎉");
      return;
    }
    setTriaging(true);
  }, [session, inboxItems.length, showToast]);

  const conclude = useCallback(
    async (id: string) => {
      await mudarStatusTarefa(id, "concluida");
      setTarefas(await listTarefas());
      showToast("Concluída ✓ +1 no placar de hoje");
    },
    [showToast],
  );

  const criarNovoContainer = useCallback(
    async (nome: string) => {
      if (!session || !newKind) return;
      const c = await createContainer(session.user.id, newKind, nome);
      setNewKind(null);
      if (c) {
        setContainers(await listContainers());
        showToast(`${newKind === "area" ? "Área" : newKind === "projeto" ? "Projeto" : "Recurso"} "${nome}" criado ✓`);
      } else {
        showToast("Não foi possível criar — tente de novo");
      }
    },
    [session, newKind, showToast],
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

  const inboxCount = session ? inboxItems.length : demoInbox.length;
  const hoje = hojeISO();
  const feitasHoje = tarefas.filter((t) => t.status === "concluida" && (t.concluida_em ?? "").slice(0, 10) === hoje).length;
  const paraHoje = tarefas.filter((t) => t.status !== "concluida" && t.status !== "algum_dia" && t.prazo !== null && t.prazo <= hoje).length;
  const placar = session ? { done: feitasHoje, total: Math.max(feitasHoje + paraHoje, 1) } : { done: 1, total: 3 };

  return (
    <div className={`app${collapsed ? " nosb" : ""}`}>
      <Sidebar
        inboxCount={inboxCount}
        activeToday={view === "dia"}
        activeTasks={view === "tarefas"}
        userEmail={session?.user.email ?? null}
        containers={session ? containers : null}
        tarefas={tarefas}
        onToday={() => setView("dia")}
        onTasks={() => setView("tarefas")}
        onInbox={openTriage}
        onNew={(kind) => (session ? setNewKind(kind) : showToast("Entre para criar os seus de verdade"))}
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
            <DayView
              key="dia"
              inboxCount={inboxCount}
              placar={placar}
              seq={seq}
              onCheck={openTriage}
              onToast={showToast}
            />
          ) : view === "tarefas" ? (
            <TasksView
              key="tarefas"
              tarefas={tarefas}
              containers={containers}
              logged={!!session}
              onConclude={conclude}
              onToast={showToast}
            />
          ) : (
            <ComingSoon key={view} title={TITLES[view][0]} info={ROADMAP[view]} />
          )}
        </div>
      </main>
      <nav className="bottomnav" aria-label="Navegação">
        {(
          [
            ["dia", "◉", "Hoje", () => setView("dia")],
            ["tarefas", "☑", "Tarefas", () => setView("tarefas")],
            ["inbox", "↓", "Inbox", openTriage],
            ["projetos", "▶", "Projetos", () => showToast("Páginas PARA — em construção nesta fase")],
            ["arquivo", "▤", "Arquivo", () => showToast("Arquivo — em construção nesta fase")],
          ] as [string, string, string, () => void][]
        ).map(([id, ico, label, fn]) => (
          <button key={id} className={(id === "dia" && view === "dia") || (id === "tarefas" && view === "tarefas") ? "active" : ""} onClick={fn}>
            <span className="ico">{ico}</span>
            {label}
          </button>
        ))}
      </nav>

      {triaging && session && (
        <TriageModal
          userId={session.user.id}
          items={inboxItems}
          containers={containers}
          onClose={() => setTriaging(false)}
          onChanged={refresh}
          onToast={showToast}
        />
      )}
      {newKind && (
        <NewContainerModal kind={newKind} onCreate={criarNovoContainer} onClose={() => setNewKind(null)} />
      )}

      <div className={`toast${toast ? " show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
