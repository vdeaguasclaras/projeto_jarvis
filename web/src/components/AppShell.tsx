"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import DayView from "@/components/DayView";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import YearView from "@/components/YearView";
import NotesView from "@/components/NotesView";
import GraphView from "@/components/GraphView";
import ComingSoon from "@/components/ComingSoon";
import AuthBar from "@/components/AuthBar";
import TasksView from "@/components/TasksView";
import TriageModal from "@/components/TriageModal";
import NewContainerModal from "@/components/NewContainerModal";
import EventoModal, { type EventoForm } from "@/components/EventoModal";
import PrioModal from "@/components/PrioModal";
import RevisaoModal from "@/components/RevisaoModal";
import Pwa from "@/components/Pwa";
import { isoDe, type DropInfo } from "@/components/TimeGrid";
import type { PrioItem } from "@/components/PrioRow";
import { ROADMAP, VIEWS, type ViewId } from "@/lib/demo";
import { encontraContainer, parseCapture, resolveDataCaptura } from "@/lib/parser";
import { supabase } from "@/lib/supabase";
import {
  agendarTarefa,
  atualizarEvento,
  capturar,
  createContainer,
  criarEvento,
  criarNota,
  criarTarefa,
  listNotas,
  definirPrioridades,
  excluirEvento,
  hojeISO,
  listContainers,
  listEventos,
  listInbox,
  listPessoas,
  listPrioridades,
  listTarefas,
  mudarStatusTarefa,
  revisaoDaSemanaFeita,
  segundaDe,
  sequenciaCheck,
  somaDias,
  type Container,
  type EscopoPrio,
  type Evento,
  type InboxItem,
  type Kind,
  type Nota,
  type Pessoa,
  type Prioridade,
  type Tarefa,
} from "@/lib/db";

const TITLES: Record<ViewId, [string, string]> = {
  dia: ["Hoje", "o dia é o ponto de entrada"],
  semana: ["Semana", "eventos e blocos de tarefa arrastáveis"],
  mes: ["Mês", "eventos e prazos, dia a dia"],
  ano: ["Ano", "densidade de compromissos, mês a mês"],
  tarefas: ["Tarefas", "capturar → organizar → fazer"],
  grafo: ["Grafo", "os links estruturam, não as pastas"],
  notas: ["Notas", "uma ideia por nota, ligadas por [[links]]"],
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
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [eventosHoje, setEventosHoje] = useState<Evento[]>([]);
  const [eventosSemana, setEventosSemana] = useState<Evento[]>([]);
  const [weekStart, setWeekStart] = useState<string>(() => segundaDe(hojeISO()));
  const [prioDia, setPrioDia] = useState<Prioridade[]>([]);
  const [prioSemana, setPrioSemana] = useState<Prioridade[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [notaAbrir, setNotaAbrir] = useState<string | null>(null);
  const [seq, setSeq] = useState(0);
  const [triaging, setTriaging] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [revisaoFeita, setRevisaoFeita] = useState(false);
  const [newKind, setNewKind] = useState<Kind | null>(null);
  const [eventoForm, setEventoForm] = useState<EventoForm | null>(null);
  const [prioEscopo, setPrioEscopo] = useState<EscopoPrio | null>(null);
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
    const hoje = hojeISO();
    const [cs, ps, inb, ts, sq, evH, evS, pd, psem, rev, ns] = await Promise.all([
      listContainers(),
      listPessoas(),
      listInbox(),
      listTarefas(),
      sequenciaCheck(),
      listEventos(hoje, somaDias(hoje, 1)),
      listEventos(weekStart, somaDias(weekStart, 7)),
      listPrioridades("dia", hoje),
      listPrioridades("semana", weekStart),
      revisaoDaSemanaFeita(),
      listNotas(),
    ]);
    setContainers(cs);
    setPessoas(ps);
    setInboxItems(inb);
    setTarefas(ts);
    setSeq(sq);
    setEventosHoje(evH);
    setEventosSemana(evS);
    setPrioDia(pd);
    setPrioSemana(psem);
    setRevisaoFeita(rev);
    setNotas(ns);
  }, [session, weekStart]);

  useEffect(() => {
    if (session) {
      refresh();
    } else {
      setContainers([]);
      setInboxItems([]);
      setTarefas([]);
      setEventosHoje([]);
      setEventosSemana([]);
      setPrioDia([]);
      setPrioSemana([]);
      setSeq(0);
      setTriaging(false);
      setRevisando(false);
      setRevisaoFeita(false);
      setNotas([]);
      setNotaAbrir(null);
    }
  }, [session, refresh]);

  const capture = useCallback(
    async (text: string) => {
      const c = parseCapture(text);
      if (session) {
        // Com #projeto ou /área reconhecidos, vira tarefa direto — a Inbox é só para o não classificado
        const alvo =
          encontraContainer(c.project, containers, ["projeto"]) ??
          encontraContainer(c.area, containers, ["area"]);
        if (alvo) {
          const prazo = resolveDataCaptura(c.date);
          const err = await criarTarefa(session.user.id, {
            titulo: c.title,
            status: "a_fazer",
            prazo,
            container_id: alvo.id,
          });
          if (err) {
            showToast(`Erro ao salvar: ${err}`);
            return;
          }
          setTarefas(await listTarefas());
          showToast(
            `Virou tarefa em ${alvo.emoji ? alvo.emoji + " " : ""}${alvo.nome}${prazo ? ` · ${c.date}` : ""} — direto, sem Inbox ✓`,
          );
          return;
        }
        const err = await capturar(session.user.id, text.trim());
        if (err) {
          showToast(`Erro ao salvar: ${err}`);
          return;
        }
        setInboxItems(await listInbox());
        showToast(`Capturado: "${c.title.slice(0, 48)}" → Inbox ✓ (triagem no check do dia)`);
      } else {
        setDemoInbox((prev) => [...prev, c.title]);
        showToast(`Capturado: "${c.title.slice(0, 48)}" (só nesta aba — entre para salvar)`);
      }
    },
    [session, containers, showToast],
  );

  const openWeekly = useCallback(() => {
    if (!session) {
      showToast("Entre com seu e-mail para fazer a revisão semanal de verdade");
      return;
    }
    setRevisando(true);
  }, [session, showToast]);

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
    async (nome: string, emoji: string | null) => {
      if (!session || !newKind) return;
      const c = await createContainer(session.user.id, newKind, nome, emoji);
      setNewKind(null);
      if (c) {
        setContainers(await listContainers());
        showToast(
          `${newKind === "area" ? "Área" : newKind === "projeto" ? "Projeto" : "Recurso"} ${emoji ? emoji + " " : ""}"${nome}" criado ✓`,
        );
      } else {
        showToast("Não foi possível criar — tente de novo");
      }
    },
    [session, newKind, showToast],
  );

  // ── Marco 5: eventos, agendamento por arrasto e prioridades ──

  const abrirNovoEvento = useCallback((dataISO: string, hora: number) => {
    setEventoForm({ titulo: "", dataISO, hIni: hora, hFim: hora + 1, container_id: null });
  }, []);

  const abrirEvento = useCallback(
    (id: string) => {
      const ev = [...eventosHoje, ...eventosSemana].find((e) => e.id === id);
      if (!ev) return;
      const i = new Date(ev.inicio);
      const f = new Date(ev.fim);
      setEventoForm({
        id: ev.id,
        titulo: ev.titulo,
        dataISO: `${i.getFullYear()}-${String(i.getMonth() + 1).padStart(2, "0")}-${String(i.getDate()).padStart(2, "0")}`,
        hIni: i.getHours() + i.getMinutes() / 60,
        hFim: f.getHours() + f.getMinutes() / 60,
        container_id: ev.container_id,
      });
    },
    [eventosHoje, eventosSemana],
  );

  const salvarEvento = useCallback(
    async (f: EventoForm) => {
      if (!session) return;
      const campos = {
        titulo: f.titulo,
        inicio: isoDe(f.dataISO, f.hIni),
        fim: isoDe(f.dataISO, f.hFim),
        container_id: f.container_id,
      };
      const err = f.id ? await atualizarEvento(f.id, campos) : await criarEvento(session.user.id, campos);
      setEventoForm(null);
      if (err) {
        showToast(`Erro ao salvar: ${err}`);
        return;
      }
      await refresh();
      showToast(f.id ? "Evento atualizado ✓" : `Evento criado: "${f.titulo}" ✓`);
    },
    [session, refresh, showToast],
  );

  const apagarEvento = useCallback(async () => {
    if (!eventoForm?.id) return;
    const err = await excluirEvento(eventoForm.id);
    setEventoForm(null);
    if (err) {
      showToast(`Erro ao excluir: ${err}`);
      return;
    }
    await refresh();
    showToast("Evento excluído ✓");
  }, [eventoForm, refresh, showToast]);

  const soltarNaGrade = useCallback(
    async (info: DropInfo, dataISO: string, hora: number) => {
      const inicio = isoDe(dataISO, hora);
      const fim = isoDe(dataISO, hora + info.durMin / 60);
      const err =
        info.tipo === "evento"
          ? await atualizarEvento(info.id, { inicio, fim })
          : await agendarTarefa(info.id, inicio, fim, dataISO);
      if (err) {
        showToast(`Erro ao mover: ${err}`);
        return;
      }
      await refresh();
      showToast(info.tipo === "evento" ? "Evento movido ✓" : "Tarefa agendada — o prazo acompanha o dia ✓");
    },
    [refresh, showToast],
  );

  // Regra do produto: a nota nasce do evento (vínculo é metadado, nada duplicado)
  const criarNotaDoEvento = useCallback(async () => {
    if (!session || !eventoForm?.id) return;
    const [a, m, d] = eventoForm.dataISO.split("-");
    const { id, err } = await criarNota(
      session.user.id,
      `${eventoForm.titulo} · ${d}/${m}/${a}`,
      `Nota do evento **${eventoForm.titulo}** (${d}/${m}).\n\n`,
      eventoForm.container_id,
      eventoForm.id,
    );
    setEventoForm(null);
    if (err || !id) {
      showToast(`Erro ao criar a nota: ${err}`);
      return;
    }
    await refresh();
    setNotaAbrir(id);
    setView("notas");
    showToast("Nota criada a partir do evento ✎ — expressar é o E do CODE");
  }, [session, eventoForm, refresh, showToast]);

  const salvarPrioridades = useCallback(
    async (ids: string[]) => {
      if (!session || !prioEscopo) return;
      const data = prioEscopo === "dia" ? hojeISO() : weekStart;
      const err = await definirPrioridades(session.user.id, prioEscopo, data, ids);
      setPrioEscopo(null);
      if (err) {
        showToast(`Erro ao salvar: ${err}`);
        return;
      }
      await refresh();
      showToast(ids.length ? `Prioridades definidas (${Math.min(ids.length, 3)}) ★` : "Prioridades limpas");
    },
    [session, prioEscopo, weekStart, refresh, showToast],
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

  const itensDePrio = (prios: Prioridade[]): PrioItem[] =>
    prios
      .map((p) => tarefas.find((t) => t.id === p.tarefa_id))
      .filter((t): t is Tarefa => !!t)
      .map((t) => ({ titulo: t.titulo, feita: t.status === "concluida" }));

  // Candidatas do modal de prioridades: abertas, prazo mais próximo primeiro
  const candidatas = tarefas
    .filter((t) => t.status === "a_fazer" || t.status === "em_andamento")
    .sort((a, b) => (a.prazo ?? "9999") < (b.prazo ?? "9999") ? -1 : 1)
    .slice(0, 24);

  // Kairós propõe: sem nada salvo, pré-seleciona as com prazo até a data-alvo
  const iniciaisPrio = (escopo: EscopoPrio): string[] => {
    const salvas = (escopo === "dia" ? prioDia : prioSemana).map((p) => p.tarefa_id);
    if (salvas.length) return salvas;
    const limite = escopo === "dia" ? hoje : somaDias(weekStart, 6);
    return candidatas.filter((t) => t.prazo !== null && t.prazo <= limite).slice(0, 3).map((t) => t.id);
  };

  return (
    <div className={`app${collapsed ? " nosb" : ""}`}>
      <Pwa logged={!!session} inboxCount={inboxItems.length} />
      <Sidebar
        inboxCount={inboxCount}
        activeToday={view === "dia"}
        activeTasks={view === "tarefas"}
        userEmail={session?.user.email ?? null}
        containers={session ? containers : null}
        tarefas={tarefas}
        onToday={() => setView("dia")}
        onTasks={() => setView("tarefas")}
        onNotes={() => setView("notas")}
        onInbox={openTriage}
        onNew={(kind) => (session ? setNewKind(kind) : showToast("Entre para criar os seus de verdade"))}
        onWeekly={openWeekly}
        weeklyDone={revisaoFeita}
        onLogout={logout}
        onSoon={(what) => showToast(`${what} — em construção nesta fase`)}
      />
      <main className="main">
        <Topbar
          view={view}
          title={TITLES[view]}
          containers={containers}
          pessoas={pessoas}
          onView={setView}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onCapture={capture}
        />
        <div className="canvas">
          {!session && <AuthBar onToast={showToast} />}
          {view === "dia" ? (
            <DayView
              key="dia"
              logged={!!session}
              hoje={hoje}
              inboxCount={inboxCount}
              placar={placar}
              seq={seq}
              eventos={eventosHoje}
              tarefas={tarefas}
              prioridades={itensDePrio(prioDia)}
              onCheck={openTriage}
              onToast={showToast}
              onSlotClick={abrirNovoEvento}
              onDrop={soltarNaGrade}
              onEventoClick={abrirEvento}
              onConcluirTarefa={conclude}
              onDefinirPrio={() => setPrioEscopo("dia")}
            />
          ) : view === "semana" ? (
            <WeekView
              key="semana"
              logged={!!session}
              hoje={hoje}
              weekStart={weekStart}
              eventos={eventosSemana}
              tarefas={tarefas}
              prioridades={itensDePrio(prioSemana)}
              onNav={(d) => setWeekStart(d === "hoje" ? segundaDe(hoje) : somaDias(weekStart, d * 7))}
              onToast={showToast}
              onSlotClick={abrirNovoEvento}
              onDrop={soltarNaGrade}
              onEventoClick={abrirEvento}
              onConcluirTarefa={conclude}
              onDefinirPrio={() => setPrioEscopo("semana")}
            />
          ) : view === "mes" ? (
            <MonthView
              key="mes"
              logged={!!session}
              tarefas={tarefas}
              onDia={(dia) => {
                setWeekStart(segundaDe(dia));
                setView("semana");
              }}
              onToast={showToast}
            />
          ) : view === "ano" ? (
            <YearView
              key="ano"
              logged={!!session}
              tarefas={tarefas}
              onDia={(dia) => {
                setWeekStart(segundaDe(dia));
                setView("semana");
              }}
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
          ) : view === "notas" ? (
            <NotesView
              key="notas"
              logged={!!session}
              userId={session?.user.id ?? null}
              containers={containers}
              abrirId={notaAbrir}
              onToast={showToast}
              onChanged={refresh}
            />
          ) : view === "grafo" ? (
            <GraphView
              key="grafo"
              logged={!!session}
              notas={notas}
              containers={containers}
              pessoas={pessoas}
              onAbrirNota={(id) => {
                setNotaAbrir(id);
                setView("notas");
              }}
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

      {revisando && session && (
        <RevisaoModal
          userId={session.user.id}
          tarefas={tarefas}
          containers={containers}
          inboxCount={inboxItems.length}
          onClose={() => setRevisando(false)}
          onChanged={refresh}
          onToast={showToast}
        />
      )}
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
      {eventoForm && session && (
        <EventoModal
          inicial={eventoForm}
          containers={containers}
          onSave={salvarEvento}
          onDelete={eventoForm.id ? apagarEvento : undefined}
          onNota={eventoForm.id ? criarNotaDoEvento : undefined}
          onClose={() => setEventoForm(null)}
        />
      )}
      {prioEscopo && session && (
        <PrioModal
          titulo={prioEscopo === "dia" ? "Prioridades de hoje" : "Prioridades da semana"}
          sub="Escolha até 3 — o Kairós propõe, você decide. Elas aparecem no topo do Dia e da Semana."
          tarefas={candidatas}
          containers={containers}
          iniciais={iniciaisPrio(prioEscopo)}
          onSave={salvarPrioridades}
          onClose={() => setPrioEscopo(null)}
          onToast={showToast}
        />
      )}

      <div className={`toast${toast ? " show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
