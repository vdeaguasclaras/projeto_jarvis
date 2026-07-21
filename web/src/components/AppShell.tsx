"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Rail, { type RailAtivo } from "@/components/Rail";
import TabBar from "@/components/TabBar";
import EspacosHub from "@/components/EspacosHub";
import Topbar from "@/components/Topbar";
import Captura, { type TipoCaptura } from "@/components/Captura";
import DayView from "@/components/DayView";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import YearView from "@/components/YearView";
import NotesView from "@/components/NotesView";
import GraphView from "@/components/GraphView";
import ComingSoon from "@/components/ComingSoon";
import AuthBar from "@/components/AuthBar";
import TasksView from "@/components/TasksView";
import Despacho from "@/components/Despacho";
import NewContainerModal from "@/components/NewContainerModal";
import EventoModal, { type EventoForm } from "@/components/EventoModal";
import EventoPanel from "@/components/EventoPanel";
import TarefaPanel, { type TarefaEdicao } from "@/components/TarefaPanel";
import ParaPage, { ParaLista } from "@/components/ParaPage";
import PrioModal from "@/components/PrioModal";
import RevisaoModal from "@/components/RevisaoModal";
import Pwa from "@/components/Pwa";
import { isoDe, type DropInfo } from "@/components/TimeGrid";
import type { PrioItem } from "@/components/PrioRow";
import { ROADMAP, VIEWS, type ViewId } from "@/lib/demo";
import { encontraContainer, normalizar, parseCapture, resolveDataCaptura } from "@/lib/parser";
import { sincronizarGoogleAgenda } from "@/lib/gcal";
import { supabase } from "@/lib/supabase";
import {
  agendarTarefa,
  atualizarEvento,
  atualizarTarefa,
  capturar,
  concluirTarefa,
  createContainer,
  criarEvento,
  criarNota,
  criarPessoa,
  criarTarefa,
  excluirTarefa,
  listNotas,
  definirPrioridades,
  excluirEvento,
  hojeISO,
  listContainers,
  listEventos,
  listInbox,
  listPessoas,
  listPrioridades,
  listProjetoAreas,
  listTarefas,
  marcarPrioFeita,
  revisaoDaSemanaFeita,
  segundaDe,
  sequenciaCheck,
  somaDias,
  subirImagemCaptura,
  type Container,
  type EscopoPrio,
  type Evento,
  type InboxItem,
  type Kind,
  type Nota,
  type Pessoa,
  type PrioEscolha,
  type Prioridade,
  type ProjetoArea,
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
  // incrementa a cada + (trilho/tab bar) para abrir a paleta de captura
  const [capSinal, setCapSinal] = useState(0);
  const [capTab, setCapTab] = useState<TipoCaptura>("tarefa");
  const [session, setSession] = useState<Session | null>(null);
  const [demoInbox, setDemoInbox] = useState<string[]>(DEMO_INBOX);
  const [containers, setContainers] = useState<Container[]>([]);
  // O A do PARA: arquivados ficam fora das listas ativas, mas visíveis no Arquivo e no grafo
  const [arquivados, setArquivados] = useState<Container[]>([]);
  const [projetoAreas, setProjetoAreas] = useState<ProjetoArea[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [eventosDia, setEventosDia] = useState<Evento[]>([]);
  const [eventosSemana, setEventosSemana] = useState<Evento[]>([]);
  const [weekStart, setWeekStart] = useState<string>(() => segundaDe(hojeISO()));
  // Dia sendo visto na visão Dia — o padrão é hoje, mas dá para navegar
  const [diaAtual, setDiaAtual] = useState<string>(() => hojeISO());
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
  const [eventoPanel, setEventoPanel] = useState<Evento | null>(null);
  const [tarefaEdit, setTarefaEdit] = useState<Tarefa | null>(null);
  // Páginas PARA: id do container aberto, ou "lista" (índice no celular)
  const [paginaId, setPaginaId] = useState<string | null>(null);
  const [prioEscopo, setPrioEscopo] = useState<EscopoPrio | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncFeito = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // listContainers traz todos — aqui separamos ativos do Arquivo
  const aplicarContainers = useCallback((cs: Container[]) => {
    setContainers(cs.filter((c) => !c.arquivado_em));
    setArquivados(cs.filter((c) => !!c.arquivado_em));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    const [cs, pa, ps, inb, ts, sq, evD, evS, pd, psem, rev, ns] = await Promise.all([
      listContainers(),
      listProjetoAreas(),
      listPessoas(),
      listInbox(),
      listTarefas(),
      sequenciaCheck(),
      // janela estendida para trás: eventos de dia inteiro longos (férias) começam antes
      listEventos(somaDias(diaAtual, -14), somaDias(diaAtual, 1)),
      listEventos(somaDias(weekStart, -14), somaDias(weekStart, 7)),
      listPrioridades("dia", diaAtual),
      listPrioridades("semana", weekStart),
      revisaoDaSemanaFeita(),
      listNotas(),
    ]);
    aplicarContainers(cs);
    setProjetoAreas(pa);
    setPessoas(ps);
    setInboxItems(inb);
    setTarefas(ts);
    setSeq(sq);
    setEventosDia(evD);
    setEventosSemana(evS);
    setPrioDia(pd);
    setPrioSemana(psem);
    setRevisaoFeita(rev);
    setNotas(ns);
  }, [session, weekStart, diaAtual, aplicarContainers]);

  useEffect(() => {
    if (session) {
      refresh();
    } else {
      setContainers([]);
      setArquivados([]);
      setProjetoAreas([]);
      setInboxItems([]);
      setTarefas([]);
      setEventosDia([]);
      setEventosSemana([]);
      setPrioDia([]);
      setPrioSemana([]);
      setSeq(0);
      setTriaging(false);
      setRevisando(false);
      setRevisaoFeita(false);
      setNotas([]);
      setNotaAbrir(null);
      syncFeito.current = false;
    }
  }, [session, refresh]);

  const capture = useCallback(
    async (text: string, imagem: File | null = null) => {
      const c = parseCapture(text);
      if (session) {
        // imagem (proposta C): sobe para o Storage e acompanha a captura
        let imagemPath: string | null = null;
        if (imagem) {
          const up = await subirImagemCaptura(session.user.id, imagem);
          if (up.err) {
            showToast(`Erro ao subir a imagem: ${up.err}`);
            return;
          }
          imagemPath = up.path;
        }
        // Vira tarefa direto com #projeto, /área OU data — a Inbox é só para o
        // incompleto (sem classificação e sem prazo). Com hora, já entra na agenda
        // (30 min por padrão — dá para ajustar no painel da tarefa).
        const alvo =
          encontraContainer(c.project, containers, ["projeto"]) ??
          encontraContainer(c.area, containers, ["area"]);
        const prazo = resolveDataCaptura(c.date);
        if (alvo || prazo) {
          let agendada: { agendada_inicio: string; agendada_fim: string } | undefined;
          if (prazo && c.time) {
            const m = c.time.match(/^(\d{1,2})h(\d{2})?$/);
            if (m) {
              const h = Number(m[1]) + Number(m[2] ?? 0) / 60;
              agendada = { agendada_inicio: isoDe(prazo, h), agendada_fim: isoDe(prazo, h + 0.5) };
            }
          }
          // @pessoa citada vira registro e fica na tarefa (as marcações persistem)
          let responsavelId: string | null = null;
          if (c.people.length) {
            const nome = c.people[0].replace(/-/g, " ");
            const existente = pessoas.find((p) => normalizar(p.nome) === normalizar(nome));
            responsavelId = existente?.id ?? (await criarPessoa(session.user.id, nome));
          }
          const { err } = await criarTarefa(session.user.id, {
            titulo: c.title,
            status: "a_fazer",
            prazo,
            container_id: alvo?.id ?? null,
            responsavel_id: responsavelId,
            imagem_path: imagemPath,
            ...agendada,
          });
          if (err) {
            showToast(`Erro ao salvar: ${err}`);
            return;
          }
          await refresh();
          const onde = alvo ? ` em ${alvo.emoji ? alvo.emoji + " " : ""}${alvo.nome}` : "";
          const quem = c.people.length ? ` com @${c.people[0].replace(/-/g, " ")}` : "";
          showToast(
            `Virou tarefa${onde}${quem}${prazo ? ` · ${c.date}` : ""}${agendada ? ` às ${c.time} — já na agenda 📅` : ""} — direto, sem Inbox ✓`,
          );
          return;
        }
        const err = await capturar(session.user.id, text.trim(), imagemPath);
        if (err) {
          showToast(`Erro ao salvar: ${err}`);
          return;
        }
        setInboxItems(await listInbox());
        showToast(`Capturado: "${c.title.slice(0, 48)}"${imagemPath ? " com imagem 🖼" : ""} → Inbox ✓ (triagem no check do dia)`);
      } else {
        setDemoInbox((prev) => [...prev, c.title]);
        showToast(`Capturado: "${c.title.slice(0, 48)}" (só nesta aba — entre para salvar)`);
      }
    },
    [session, containers, pessoas, refresh, showToast],
  );

  // ── Fase 2: sync do Google Calendar ──
  const syncAgenda = useCallback(
    async (silencioso = false) => {
      if (!session) return;
      const r = await sincronizarGoogleAgenda(session.user.id);
      if (r.ok) {
        await refresh();
        showToast(
          `Google sincronizado: ${r.importados} evento${r.importados === 1 ? "" : "s"} de ${r.agendas} agenda${r.agendas === 1 ? "" : "s"} (janela de 67 dias) ⇄`,
        );
      } else if (!silencioso) {
        showToast(
          r.motivo === "sem_token" || r.motivo === "expirado"
            ? "Para sincronizar, entre com Google de novo (o acesso à agenda dura ~1h por login)"
            : r.motivo === "api_desligada"
              ? "Ative a Google Calendar API no console do Google Cloud (APIs & Services → Library)"
              : `Erro no sync: ${r.detalhe ?? "desconhecido"}`,
        );
      }
    },
    [session, refresh, showToast],
  );

  // Ao entrar com Google, a agenda sincroniza sozinha (uma vez por sessão)
  useEffect(() => {
    if (!session || syncFeito.current) return;
    syncFeito.current = true;
    syncAgenda(true);
  }, [session, syncAgenda]);

  const openWeekly = useCallback(() => {
    if (!session) {
      showToast("Entre com seu e-mail para fazer a revisão semanal de verdade");
      return;
    }
    setRevisando(true);
  }, [session, showToast]);

  // Tarefas de hoje (ou vencidas) ainda sem horário — a etapa final do check cuida delas
  const tarefasSemHorario = tarefas.filter(
    (t) =>
      (t.status === "a_fazer" || t.status === "em_andamento") &&
      !t.agendada_inicio &&
      t.prazo !== null &&
      t.prazo <= hojeISO(),
  );

  const openTriage = useCallback(() => {
    if (!session) {
      showToast("Entre com seu e-mail para despachar a Inbox de verdade");
      return;
    }
    if (!inboxItems.length && !tarefasSemHorario.length) {
      showToast("Inbox zero e dia com horários no lugar — nada para despachar 🎉");
      return;
    }
    setTriaging(true);
  }, [session, inboxItems.length, tarefasSemHorario.length, showToast]);

  const conclude = useCallback(
    async (id: string) => {
      const t = tarefas.find((x) => x.id === id);
      if (!t || !session) return;
      const prox = await concluirTarefa(session.user.id, t);
      setTarefas(await listTarefas());
      showToast(
        prox
          ? `Concluída ✓ — recorrente: a próxima já nasceu para ${prox.split("-").reverse().slice(0, 2).join("/")}`
          : "Concluída ✓ +1 no placar de hoje",
      );
    },
    [tarefas, session, showToast],
  );

  const salvarTarefa = useCallback(
    async (campos: TarefaEdicao) => {
      if (!tarefaEdit) return;
      const err = await atualizarTarefa(tarefaEdit.id, campos);
      setTarefaEdit(null);
      if (err) {
        showToast(`Erro ao salvar: ${err}`);
        return;
      }
      await refresh();
      showToast(`Tarefa atualizada ✓${campos.recorrencia ? " — repete " + (campos.recorrencia === "diaria" ? "todo dia" : campos.recorrencia) : ""}`);
    },
    [tarefaEdit, refresh, showToast],
  );

  const apagarTarefa = useCallback(async () => {
    if (!tarefaEdit) return;
    if (!window.confirm(`Excluir a tarefa "${tarefaEdit.titulo}"?`)) return;
    const err = await excluirTarefa(tarefaEdit.id);
    setTarefaEdit(null);
    if (err) {
      showToast(`Erro ao excluir: ${err}`);
      return;
    }
    await refresh();
    showToast("Tarefa excluída");
  }, [tarefaEdit, refresh, showToast]);

  const criarNovoContainer = useCallback(
    async (nome: string, icone: string | null, areaIds: string[]) => {
      if (!session || !newKind) return;
      const c = await createContainer(session.user.id, newKind, nome, icone, areaIds);
      setNewKind(null);
      if (c) {
        aplicarContainers(await listContainers());
        setProjetoAreas(await listProjetoAreas());
        showToast(
          `${newKind === "area" ? "Área" : newKind === "projeto" ? "Projeto" : "Recurso"} ${icone ? icone + " " : ""}"${nome}" criado ✓`,
        );
      } else {
        showToast("Não foi possível criar — tente de novo");
      }
    },
    [session, newKind, showToast, aplicarContainers],
  );

  // Tarefa rápida da coluna "sem horário" do Dia — nasce com prazo no dia visto
  const novaTarefaDoDia = useCallback(
    async (titulo: string, dia: string) => {
      if (!session) return;
      const { err } = await criarTarefa(session.user.id, { titulo, status: "a_fazer", prazo: dia });
      if (err) {
        showToast(`Erro ao criar: ${err}`);
        return;
      }
      await refresh();
      showToast(`"${titulo.slice(0, 40)}" no dia ${dia.split("-").reverse().slice(0, 2).join("/")} — sem hora marcada ✓`);
    },
    [session, refresh, showToast],
  );

  // ── Marco 5: eventos, agendamento por arrasto e prioridades ──

  const abrirNovoEvento = useCallback((dataISO: string, hora: number) => {
    setEventoForm({ titulo: "", dataISO, hIni: hora, hFim: hora + 1, container_id: null });
  }, []);

  // Clique num evento abre o painel lateral (info + notas) — não a edição direta
  const abrirEvento = useCallback(
    (id: string) => {
      const ev = [...eventosDia, ...eventosSemana].find((e) => e.id === id);
      if (ev) setEventoPanel(ev);
    },
    [eventosDia, eventosSemana],
  );

  const editarDoPainel = useCallback(() => {
    const ev = eventoPanel;
    if (!ev) return;
    setEventoPanel(null);
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
  }, [eventoPanel]);

  const excluirDoPainel = useCallback(async () => {
    if (!eventoPanel) return;
    const err = await excluirEvento(eventoPanel.id);
    setEventoPanel(null);
    if (err) {
      showToast(`Erro ao excluir: ${err}`);
      return;
    }
    await refresh();
    showToast("Evento excluído ✓");
  }, [eventoPanel, refresh, showToast]);

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
      if (info.tipo === "evento") {
        const ev = [...eventosDia, ...eventosSemana].find((e) => e.id === info.id);
        if (ev?.origem === "google") {
          showToast("Evento do Google Agenda — mova lá; o sync espelha aqui ⇄");
          return;
        }
      }
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
    [eventosDia, eventosSemana, refresh, showToast],
  );

  // Regra do produto: a nota nasce do evento (vínculo é metadado, nada duplicado)
  const criarNotaDoEvento = useCallback(async () => {
    if (!session || !eventoPanel) return;
    const i = new Date(eventoPanel.inicio);
    const d = String(i.getDate()).padStart(2, "0");
    const m = String(i.getMonth() + 1).padStart(2, "0");
    const { id, err } = await criarNota(
      session.user.id,
      `${eventoPanel.titulo} · ${d}/${m}/${i.getFullYear()}`,
      `Nota do evento **${eventoPanel.titulo}** (${d}/${m}).\n\n`,
      eventoPanel.container_id,
      eventoPanel.id,
    );
    setEventoPanel(null);
    if (err || !id) {
      showToast(`Erro ao criar a nota: ${err}`);
      return;
    }
    await refresh();
    setNotaAbrir(id);
    irParaView("notas");
    showToast("Nota criada a partir do evento ✎ — expressar é o E do CODE");
  }, [session, eventoPanel, refresh, showToast]);

  const salvarPrioridades = useCallback(
    async (escolhas: PrioEscolha[]) => {
      if (!session || !prioEscopo) return;
      const data = prioEscopo === "dia" ? diaAtual : weekStart;
      const err = await definirPrioridades(session.user.id, prioEscopo, data, escolhas);
      setPrioEscopo(null);
      if (err) {
        showToast(`Erro ao salvar: ${err}`);
        return;
      }
      await refresh();
      showToast(escolhas.length ? `Prioridades definidas (${Math.min(escolhas.length, 3)}) ★` : "Prioridades limpas");
    },
    [session, prioEscopo, diaAtual, weekStart, refresh, showToast],
  );

  // ── Prioridades acionáveis (pedido do Raul): ✓ conclui, clique abre ──
  const concluirPrio = useCallback(
    async (p: PrioItem) => {
      if (p.tarefaId) {
        await conclude(p.tarefaId);
        return;
      }
      const err = await marcarPrioFeita(p.id, !p.feita);
      if (err) {
        showToast(`Erro: ${err}`);
        return;
      }
      await refresh();
      showToast(!p.feita ? "Prioridade feita ✓ — era isso que importava hoje" : "Prioridade reaberta");
    },
    [conclude, refresh, showToast],
  );

  const abrirPrio = useCallback(
    (p: PrioItem) => {
      if (!p.tarefaId) {
        concluirPrio(p);
        return;
      }
      const t = tarefas.find((x) => x.id === p.tarefaId);
      if (t) setTarefaEdit(t);
    },
    [tarefas, concluirPrio],
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    showToast("Você saiu — de volta ao modo demonstração");
  }, [showToast]);

  // Trocar de visão fecha a página PARA aberta
  const irParaView = useCallback((v: ViewId) => {
    setPaginaId(null);
    setView(v);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      // os atalhos "c" e ⌘K da captura vivem na paleta (Captura.tsx)
      const match = VIEWS.find((v) => v.key === e.key);
      if (match) irParaView(match.id);
      // atalho global do redesign: D abre o Despacho
      if (e.key === "d" && !e.metaKey && !e.ctrlKey && !e.altKey) openTriage();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [irParaView, openTriage]);

  // Qual item do trilho/tab bar está aceso (Espaços cobre PARA, notas, grafo e arquivo)
  const railAtivo: RailAtivo = paginaId
    ? "espacos"
    : view === "dia"
      ? "hoje"
      : view === "semana" || view === "mes" || view === "ano"
        ? "agenda"
        : view === "tarefas"
          ? "tarefas"
          : "espacos";

  const irHoje = useCallback(() => {
    setDiaAtual(hojeISO());
    irParaView("dia");
  }, [irParaView]);

  const irEspacos = useCallback(() => {
    if (!session) {
      showToast("Entre para ver os seus Espaços");
      return;
    }
    setPaginaId("lista");
  }, [session, showToast]);

  const abrirCaptura = useCallback((tipo: TipoCaptura = "tarefa") => {
    setCapTab(tipo);
    setCapSinal((n) => n + 1);
  }, []);

  // ── Etapa C: a paleta cria tarefa (regras de sempre), nota ou evento ──
  const criarDaPaleta = useCallback(
    async (tipo: TipoCaptura, texto: string, imagem: File | null) => {
      if (tipo === "tarefa") {
        await capture(texto, imagem);
        return;
      }
      if (!session) {
        showToast("Entre para criar notas e eventos de verdade");
        return;
      }
      const c = parseCapture(texto);
      const alvo =
        encontraContainer(c.project, containers, ["projeto"]) ??
        encontraContainer(c.area, containers, ["area"]);
      if (tipo === "nota") {
        // primeira linha vira o título; o corpo se escreve no editor
        const { id, err } = await criarNota(session.user.id, c.title, "", alvo?.id ?? null);
        if (err || !id) {
          showToast(`Erro ao criar a nota: ${err}`);
          return;
        }
        await refresh();
        setNotaAbrir(id);
        irParaView("notas");
        showToast(`Nota criada${alvo ? ` em ${alvo.nome}` : ""} ✎ — escreva à vontade`);
        return;
      }
      // evento: data do parser (sem data = o dia visto); sem hora = dia inteiro
      const data = resolveDataCaptura(c.date) ?? diaAtual;
      const m = c.time?.match(/^(\d{1,2})h(\d{2})?$/);
      const err = m
        ? await criarEvento(session.user.id, {
            titulo: c.title,
            inicio: isoDe(data, Number(m[1]) + Number(m[2] ?? 0) / 60),
            fim: isoDe(data, Number(m[1]) + Number(m[2] ?? 0) / 60 + 1),
            container_id: alvo?.id ?? null,
          })
        : await criarEvento(session.user.id, {
            titulo: c.title,
            inicio: isoDe(data, 0),
            fim: isoDe(somaDias(data, 1), 0),
            container_id: alvo?.id ?? null,
            dia_inteiro: true,
          });
      if (err) {
        showToast(`Erro ao criar o evento: ${err}`);
        return;
      }
      await refresh();
      showToast(
        `Evento criado: "${c.title}" · ${data.split("-").reverse().slice(0, 2).join("/")}${m ? ` às ${c.time}` : " · o dia todo"} ✓`,
      );
    },
    [session, containers, capture, refresh, showToast, irParaView, diaAtual],
  );

  const inboxCount = session ? inboxItems.length : demoInbox.length;
  const hoje = hojeISO();
  // Saudação do header: primeiro nome do login Google, senão o prefixo do e-mail
  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const primeiroNome = session
    ? (() => {
        const bruto = (meta.full_name || meta.name || session.user.email?.split("@")[0] || "").trim().split(/\s+/)[0];
        return bruto ? bruto.charAt(0).toUpperCase() + bruto.slice(1) : null;
      })()
    : null;
  const feitasHoje = tarefas.filter((t) => t.status === "concluida" && (t.concluida_em ?? "").slice(0, 10) === hoje).length;
  const paraHoje = tarefas.filter((t) => t.status !== "concluida" && t.status !== "algum_dia" && t.prazo !== null && t.prazo <= hoje).length;
  const placar = session ? { done: feitasHoje, total: Math.max(feitasHoje + paraHoje, 1) } : { done: 1, total: 3 };

  const itensDePrio = (prios: Prioridade[]): PrioItem[] =>
    prios
      .map((p): PrioItem | null => {
        if (p.tarefa_id) {
          const t = tarefas.find((x) => x.id === p.tarefa_id);
          if (!t) return null;
          return {
            id: p.id,
            tarefaId: t.id,
            titulo: t.titulo,
            feita: t.status === "concluida",
            durMin: t.duracao_min ?? 30,
            agendada: !!t.agendada_inicio,
          };
        }
        return { id: p.id, tarefaId: null, titulo: p.titulo ?? "", feita: p.feita, durMin: 30, agendada: false };
      })
      .filter((p): p is PrioItem => p !== null);

  // Candidatas do modal de prioridades: abertas, prazo mais próximo primeiro
  const candidatas = tarefas
    .filter((t) => t.status === "a_fazer" || t.status === "em_andamento")
    .sort((a, b) => (a.prazo ?? "9999") < (b.prazo ?? "9999") ? -1 : 1);

  // Kairós propõe: as com prazo até a data-alvo (o usuário decide no modal)
  const sugeridasPrio = (escopo: EscopoPrio): string[] => {
    const limite = escopo === "dia" ? diaAtual : somaDias(weekStart, 6);
    return candidatas.filter((t) => t.prazo !== null && t.prazo <= limite).slice(0, 6).map((t) => t.id);
  };

  const atuaisPrio = (escopo: EscopoPrio): PrioEscolha[] =>
    (escopo === "dia" ? prioDia : prioSemana).map((p) => ({ tarefa_id: p.tarefa_id, titulo: p.titulo, feita: p.feita }));

  return (
    <div className="app">
      <Pwa logged={!!session} inboxCount={inboxItems.length} />
      <Rail
        ativo={railAtivo}
        userEmail={session?.user.email ?? null}
        weeklyDone={revisaoFeita}
        onHoje={irHoje}
        onAgenda={() => irParaView("semana")}
        onCapturar={() => abrirCaptura("tarefa")}
        onTarefas={() => irParaView("tarefas")}
        onEspacos={irEspacos}
        onSync={() => (session ? syncAgenda() : showToast("Entre com Google para trazer a sua agenda"))}
        onWeekly={openWeekly}
        onLogout={logout}
      />
      <main className="main">
        <Topbar
          view={view}
          title={TITLES[view]}
          diaAtual={diaAtual}
          hoje={hoje}
          nome={primeiroNome}
          seq={session ? seq : 0}
          placar={placar}
          onView={irParaView}
          onNavDia={(d) => (session ? setDiaAtual(d) : showToast("Entre para navegar pelos seus dias"))}
          onNavSemana={(d) => setWeekStart(d === 0 ? segundaDe(hoje) : somaDias(weekStart, d * 7))}
        />
        <div className="canvas">
          {!session && <AuthBar onToast={showToast} />}
          {session && paginaId === "lista" ? (
            <EspacosHub
              containers={containers}
              arquivados={arquivados}
              tarefas={tarefas}
              onOpen={setPaginaId}
              onNotas={() => irParaView("notas")}
              onGrafo={() => irParaView("grafo")}
              onArquivo={() => setPaginaId("arquivo")}
              onNovo={setNewKind}
            />
          ) : session && paginaId === "arquivo" ? (
            <ParaLista
              containers={containers}
              arquivados={arquivados}
              tarefas={tarefas}
              soArquivo
              onOpen={setPaginaId}
            />
          ) : session && paginaId && [...containers, ...arquivados].some((c) => c.id === paginaId) ? (
            <ParaPage
              key={paginaId}
              userId={session.user.id}
              container={[...containers, ...arquivados].find((c) => c.id === paginaId)!}
              containers={containers}
              projetoAreas={projetoAreas}
              tarefas={tarefas}
              notas={notas}
              onBack={() => setPaginaId(null)}
              onConclude={conclude}
              onEditTarefa={setTarefaEdit}
              onAbrirNota={(id) => {
                setNotaAbrir(id);
                irParaView("notas");
              }}
              onOpenContainer={setPaginaId}
              onChanged={refresh}
              onToast={showToast}
            />
          ) : view === "dia" ? (
            <DayView
              key="dia"
              logged={!!session}
              dia={diaAtual}
              hoje={hoje}
              inboxCount={inboxCount}
              seq={session ? seq : 0}
              eventos={eventosDia}
              tarefas={tarefas}
              pessoas={pessoas}
              prioridades={itensDePrio(prioDia)}
              onNavDia={setDiaAtual}
              onCheck={openTriage}
              onToast={showToast}
              onSlotClick={abrirNovoEvento}
              onDrop={soltarNaGrade}
              onEventoClick={abrirEvento}
              onConcluirTarefa={conclude}
              onEditTarefa={setTarefaEdit}
              onNovaTarefaDia={novaTarefaDoDia}
              onDefinirPrio={() => setPrioEscopo("dia")}
              onPrioAbrir={abrirPrio}
              onPrioConcluir={concluirPrio}
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
              onEditTarefa={setTarefaEdit}
              onDia={(d) => {
                setDiaAtual(d);
                irParaView("dia");
              }}
              onDefinirPrio={() => setPrioEscopo("semana")}
              onPrioAbrir={abrirPrio}
              onPrioConcluir={concluirPrio}
            />
          ) : view === "mes" ? (
            <MonthView
              key="mes"
              logged={!!session}
              tarefas={tarefas}
              onDia={(dia) => {
                setWeekStart(segundaDe(dia));
                irParaView("semana");
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
                irParaView("semana");
              }}
            />
          ) : view === "tarefas" ? (
            <TasksView
              key="tarefas"
              tarefas={tarefas}
              containers={containers}
              pessoas={pessoas}
              logged={!!session}
              onConclude={conclude}
              onEdit={setTarefaEdit}
              onToast={showToast}
            />
          ) : view === "notas" ? (
            <NotesView
              key="notas"
              logged={!!session}
              userId={session?.user.id ?? null}
              containers={containers}
              arquivados={arquivados}
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
              arquivados={arquivados}
              projetoAreas={projetoAreas}
              pessoas={pessoas}
              onAbrirNota={(id) => {
                setNotaAbrir(id);
                irParaView("notas");
              }}
              onAbrirContainer={setPaginaId}
              onToast={showToast}
            />
          ) : (
            <ComingSoon key={view} title={TITLES[view][0]} info={ROADMAP[view]} />
          )}
        </div>
      </main>
      <TabBar
        ativo={railAtivo}
        onHoje={irHoje}
        onCalendario={() => irParaView("semana")}
        onCapturar={abrirCaptura}
        onTarefas={() => irParaView("tarefas")}
        onEspacos={irEspacos}
      />

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
        <Despacho
          userId={session.user.id}
          items={inboxItems}
          containers={containers}
          tarefasSemHorario={tarefasSemHorario}
          seq={seq}
          onClose={() => setTriaging(false)}
          onChanged={refresh}
          onToast={showToast}
        />
      )}
      {newKind && (
        <NewContainerModal
          kind={newKind}
          areas={containers.filter((c) => c.kind === "area")}
          onCreate={criarNovoContainer}
          onClose={() => setNewKind(null)}
        />
      )}
      {eventoPanel && session && (
        <EventoPanel
          evento={eventoPanel}
          containers={containers}
          notas={notas}
          onEditar={editarDoPainel}
          onExcluir={excluirDoPainel}
          onNovaNota={criarNotaDoEvento}
          onAbrirNota={(id) => {
            setEventoPanel(null);
            setNotaAbrir(id);
            irParaView("notas");
          }}
          onClose={() => setEventoPanel(null)}
        />
      )}
      {tarefaEdit && session && (
        <TarefaPanel
          tarefa={tarefaEdit}
          containers={containers}
          pessoas={pessoas}
          onSave={salvarTarefa}
          onConcluir={() => {
            conclude(tarefaEdit.id);
            setTarefaEdit(null);
          }}
          onDelete={apagarTarefa}
          onClose={() => setTarefaEdit(null)}
        />
      )}
      {eventoForm && session && (
        <EventoModal
          inicial={eventoForm}
          containers={containers}
          onSave={salvarEvento}
          onDelete={eventoForm.id ? apagarEvento : undefined}
          onClose={() => setEventoForm(null)}
        />
      )}
      {prioEscopo && session && (
        <PrioModal
          titulo={prioEscopo === "dia" ? (diaAtual === hoje ? "Prioridades de hoje" : `Prioridades de ${diaAtual.split("-").reverse().slice(0, 2).join("/")}`) : "Prioridades da semana"}
          sub="Escolha até 3 — o Kairós propõe, você decide. Pode ser tarefa ou algo avulso, como a preparação para uma reunião."
          tarefas={candidatas}
          sugeridas={sugeridasPrio(prioEscopo)}
          atuais={atuaisPrio(prioEscopo)}
          containers={containers}
          onSave={salvarPrioridades}
          onClose={() => setPrioEscopo(null)}
          onToast={showToast}
        />
      )}

      <Captura
        logged={!!session}
        abrirSinal={capSinal}
        tabInicial={capTab}
        containers={containers}
        pessoas={pessoas}
        onCriar={criarDaPaleta}
        onToast={showToast}
      />

      <div className={`toast${toast ? " show" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
