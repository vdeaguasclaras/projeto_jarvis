"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  agendarTarefa,
  atualizarTarefa,
  criarNota,
  criarPessoa,
  criarTarefa,
  desincubarItem,
  destriarItem,
  excluirNota,
  excluirTarefa,
  hojeISO,
  incubarItem,
  marcarTriado,
  registrarRitual,
  resolvePrazo,
  type Container,
  type InboxItem,
  type Tarefa,
} from "@/lib/db";
import { parseCapture } from "@/lib/parser";
import { isoDe } from "@/components/TimeGrid";
import CapturaImagem from "@/components/CapturaImagem";

/** Despacho (redesign 11a/2b/3a) — o novo nome do check do dia.
 *  Desktop: visão sobre o canvas com a fila à esquerda e um card central
 *  com os 6 destinos sempre visíveis (atalhos 1–6, ⏎ confirma, E edita o
 *  título, ⌫ desfaz, F já fiz). Celular: bottom sheet sobre o fundo
 *  escurecido, um item por vez, swipe para a direita = Planejar.
 *  A máquina GTD é a mesma do check antigo; o ritual segue "check_dia". */

type Destino = "agendar" | "delegar" | "nota" | "referencia" | "incubar" | "descartar";

const DESTINOS: { id: Destino; icone: string; rotulo: string; classe: string }[] = [
  { id: "agendar", icone: "🗓", rotulo: "Agendar", classe: "verde" },
  { id: "delegar", icone: "→", rotulo: "Delegar", classe: "" },
  { id: "nota", icone: "✎", rotulo: "Vira nota", classe: "lilas" },
  { id: "referencia", icone: "▤", rotulo: "Referência", classe: "" },
  { id: "incubar", icone: "⏳", rotulo: "Incubar", classe: "quente" },
  { id: "descartar", icone: "✕", rotulo: "Descartar", classe: "apagado" },
];

type Desfazivel = { itemId: string; rotulo: string; undo: () => Promise<void> };

type Props = {
  userId: string;
  items: InboxItem[];
  containers: Container[];
  /** tarefas de hoje (ou vencidas) ainda sem horário — etapa final */
  tarefasSemHorario: Tarefa[];
  seq: number;
  onClose: () => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

function proximaHora(): string {
  const h = Math.min(Math.max(new Date().getHours() + 1, 8), 22);
  return `${String(h).padStart(2, "0")}:00`;
}

export default function Despacho({ userId, items, containers, tarefasSemHorario, seq, onClose, onChanged, onToast }: Props) {
  const [feitos, setFeitos] = useState<string[]>([]);
  const pendentes = items.filter((it) => !feitos.includes(it.id));
  const [curId, setCurId] = useState<string | null>(pendentes[0]?.id ?? null);
  const item = pendentes.find((it) => it.id === curId) ?? pendentes[0] ?? null;
  const inboxZerada = pendentes.length === 0;

  const [destino, setDestino] = useState<Destino>("agendar");
  const [titulo, setTitulo] = useState("");
  const [editando, setEditando] = useState(false);
  const [quando, setQuando] = useState<string | null>("hoje");
  const [dataLivre, setDataLivre] = useState("");
  const [containerId, setContainerId] = useState<string | null>(null);
  const [quem, setQuem] = useState("");
  const [desfazer, setDesfazer] = useState<Desfazivel[]>([]);
  const [swipeX, setSwipeX] = useState(0);
  const swipeIni = useRef<number | null>(null);
  const tituloRef = useRef<HTMLInputElement | null>(null);
  const quemRef = useRef<HTMLInputElement | null>(null);

  // ── etapa final: tarefas de hoje sem horário (funcionalidade preservada) ──
  const [agendadasIds, setAgendadasIds] = useState<string[]>([]);
  const [selTarefa, setSelTarefa] = useState<string | null>(null);
  const [fDia, setFDia] = useState(hojeISO());
  const [fHora, setFHora] = useState(proximaHora());
  const [fGrupo, setFGrupo] = useState<string | null>(null);
  const tarefasPendentes = tarefasSemHorario.filter((t) => !agendadasIds.includes(t.id));

  // ao trocar de item, o formulário volta ao padrão (hoje é o primeiro chip)
  useEffect(() => {
    if (!item) return;
    setDestino("agendar");
    setTitulo(parseCapture(item.texto).title);
    setEditando(false);
    setQuando("hoje");
    setDataLivre("");
    setContainerId(null);
    setQuem("");
    setSwipeX(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const prazoEscolhido = quando === "escolher" ? dataLivre || null : resolvePrazo(quando);

  const avancar = useCallback(
    async (msg: string, undoEntry: Desfazivel | null) => {
      if (!item) return;
      onToast(msg);
      if (undoEntry) setDesfazer((prev) => [...prev, undoEntry]);
      const novosFeitos = [...feitos, item.id];
      setFeitos(novosFeitos);
      const resta = items.filter((it) => !novosFeitos.includes(it.id));
      setCurId(resta[0]?.id ?? null);
      if (!resta.length) await registrarRitual(userId, "check_dia", { triados: items.length });
      onChanged();
    },
    [item, feitos, items, userId, onToast, onChanged],
  );

  const confirmar = useCallback(async () => {
    if (!item) return;
    const tituloFinal = titulo.trim() || parseCapture(item.texto).title;
    const c = containers.find((x) => x.id === containerId);
    if (destino === "agendar") {
      const { id, err } = await criarTarefa(userId, {
        titulo: tituloFinal,
        status: "a_fazer",
        prazo: prazoEscolhido,
        container_id: containerId,
        imagem_path: item.imagem_path,
      });
      if (err) return onToast(`Erro: ${err}`);
      await marcarTriado(item.id);
      await avancar(`Tarefa criada${c ? ` em ${c.nome}` : ""}${prazoEscolhido ? ` · ${prazoEscolhido.split("-").reverse().slice(0, 2).join("/")}` : ""} ✓`, {
        itemId: item.id,
        rotulo: tituloFinal,
        undo: async () => {
          if (id) await excluirTarefa(id);
          await destriarItem(item.id);
        },
      });
      return;
    }
    if (destino === "delegar") {
      const nome = quem.trim() || "alguém";
      const pessoaId = await criarPessoa(userId, nome);
      const { id, err } = await criarTarefa(userId, {
        titulo: tituloFinal,
        status: "em_espera",
        prazo: prazoEscolhido,
        responsavel_id: pessoaId,
        descricao: `Delegada para @${nome}`,
        imagem_path: item.imagem_path,
      });
      if (err) return onToast(`Erro: ${err}`);
      await marcarTriado(item.id);
      await avancar(`Delegada para @${nome} — acompanhando em "Em espera"`, {
        itemId: item.id,
        rotulo: tituloFinal,
        undo: async () => {
          if (id) await excluirTarefa(id);
          await destriarItem(item.id);
        },
      });
      return;
    }
    if (destino === "nota" || destino === "referencia") {
      const { id, err } = await criarNota(userId, item.texto.slice(0, 80), item.texto, containerId);
      if (err) return onToast(`Erro: ${err}`);
      await marcarTriado(item.id);
      await avancar(
        destino === "nota" ? "Nota criada — expressar ✎" : `Referência guardada${c ? ` em ${c.nome}` : ""} ✓`,
        {
          itemId: item.id,
          rotulo: tituloFinal,
          undo: async () => {
            if (id) await excluirNota(id);
            await destriarItem(item.id);
          },
        },
      );
      return;
    }
    if (destino === "incubar") {
      const volta = await incubarItem(item.id);
      await avancar(`Incubada ⏳ — volta ao Despacho em ${volta.split("-").reverse().join("/")}`, {
        itemId: item.id,
        rotulo: tituloFinal,
        undo: async () => desincubarItem(item.id),
      });
      return;
    }
    await marcarTriado(item.id);
    await avancar("Descartada — sem dó", {
      itemId: item.id,
      rotulo: tituloFinal,
      undo: async () => destriarItem(item.id),
    });
  }, [item, titulo, destino, containerId, containers, prazoEscolhido, quem, userId, avancar, onToast]);

  const jaFiz = useCallback(async () => {
    if (!item) return;
    const tituloFinal = titulo.trim() || parseCapture(item.texto).title;
    const { id, err } = await criarTarefa(userId, { titulo: tituloFinal, concluida: true, imagem_path: item.imagem_path });
    if (err) return onToast(`Erro: ${err}`);
    await marcarTriado(item.id);
    await avancar("Registrada como feita ✓ (regra dos 2 minutos)", {
      itemId: item.id,
      rotulo: tituloFinal,
      undo: async () => {
        if (id) await excluirTarefa(id);
        await destriarItem(item.id);
      },
    });
  }, [item, titulo, userId, avancar, onToast]);

  const desfazerUltimo = useCallback(async () => {
    const ultimo = desfazer[desfazer.length - 1];
    if (!ultimo) {
      onToast("Nada para desfazer");
      return;
    }
    await ultimo.undo();
    setDesfazer((prev) => prev.slice(0, -1));
    setFeitos((prev) => prev.filter((id) => id !== ultimo.itemId));
    setCurId(ultimo.itemId);
    onChanged();
    onToast(`Desfeito — "${ultimo.rotulo.slice(0, 40)}" voltou à fila ↩`);
  }, [desfazer, onChanged, onToast]);

  // ── atalhos: 1–6 destino · ⏎ confirma · E edita · ⌫ desfaz · F já fiz ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      const emCampo = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (!item) return;
      if (e.key === "Enter" && !emCampo) {
        e.preventDefault();
        confirmar();
        return;
      }
      if (emCampo) {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmar();
        }
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 6) {
        setDestino(DESTINOS[n - 1].id);
        return;
      }
      if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setEditando(true);
        requestAnimationFrame(() => tituloRef.current?.focus());
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        desfazerUltimo();
        return;
      }
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        jaFiz();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, confirmar, desfazerUltimo, jaFiz, onClose]);

  // delegar pede o nome — foca ao escolher o destino
  useEffect(() => {
    if (destino === "delegar") requestAnimationFrame(() => quemRef.current?.focus());
  }, [destino]);

  const reservar = async () => {
    const t = tarefasPendentes.find((x) => x.id === selTarefa);
    if (!t || !fDia || !fHora) return;
    const [hh, mm] = fHora.split(":").map(Number);
    const h = (hh || 0) + (mm || 0) / 60;
    const dur = (t.duracao_min ?? 60) / 60;
    const err = await agendarTarefa(t.id, isoDe(fDia, h), isoDe(fDia, h + dur), fDia);
    if (err) return onToast(`Erro ao reservar: ${err}`);
    if (fGrupo !== t.container_id) await atualizarTarefa(t.id, { container_id: fGrupo });
    setAgendadasIds((prev) => [...prev, t.id]);
    setSelTarefa(null);
    onChanged();
    onToast(`"${t.titulo.slice(0, 40)}" reservada para ${fDia.split("-").reverse().slice(0, 2).join("/")} às ${fHora} ✓`);
  };

  // swipe para a direita (celular, 3a) = Planejar → destaca Agendar
  const swipeFim = () => {
    if (swipeX > 70) {
      setDestino("agendar");
      onToast("Planejar: escolha quando e o projeto, ⏎ confirma 🗓");
    }
    setSwipeX(0);
    swipeIni.current = null;
  };

  const pill = (on: boolean) => `pill-opt${on ? " on" : ""}`;
  const containersDe = (kinds: string[]) => containers.filter((c) => kinds.includes(c.kind));
  const rotuloQuando = quando === "escolher" ? (dataLivre ? dataLivre.split("-").reverse().slice(0, 2).join("/") : "…") : (quando ?? "sem data");
  const ctaRotulo =
    destino === "agendar"
      ? `Criar · ${rotuloQuando} ✓`
      : destino === "delegar"
        ? `Delegar${quem.trim() ? ` p/ ${quem.trim()}` : ""} ✓`
        : destino === "nota"
          ? "Criar a nota ✓"
          : destino === "referencia"
            ? "Guardar ✓"
            : destino === "incubar"
              ? "Incubar por 90 dias ⏳"
              : "Descartar ✕";

  return (
    <>
      <div className="desp-scrim" onClick={onClose} />
      <div className="despacho" role="dialog" aria-label="Despacho">
        <div className="desp-head">
          <div className="desp-titulo">
            <h1>Despacho</h1>
            <small>um destino por item · Inbox zero em minutos</small>
          </div>
          <div className="desp-prog" aria-label={`${feitos.length} de ${items.length}`}>
            <span className="desp-segs">
              {items.map((it, i) => (
                <i key={it.id} className={i < feitos.length ? "on" : ""} />
              ))}
            </span>
            <span className="desp-n">
              <b>{Math.min(feitos.length + 1, Math.max(items.length, 1))} de {Math.max(items.length, 1)}</b>
            </span>
          </div>
          <button className="sp-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {inboxZerada ? (
          <div className="desp-zero">
            {tarefasPendentes.length > 0 ? (
              <>
                <div className="allclear" style={{ padding: "8px 10px 4px" }}>
                  <div className="big">✓</div>
                  <h4>Inbox zero!</h4>
                  <p>
                    Agora, o dia: {tarefasPendentes.length} tarefa{tarefasPendentes.length > 1 ? "s" : ""} para hoje ainda sem
                    horário. Toque numa para reservar dia e hora — ou conclua e deixe como estão.
                  </p>
                </div>
                {tarefasPendentes.map((t) =>
                  selTarefa === t.id ? (
                    <div key={t.id} className="triage-card" style={{ marginBottom: 8 }}>
                      <div className="triage-title" style={{ fontSize: 13.5 }}>{t.titulo}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 130px" }}>
                          <div className="flab">Dia</div>
                          <input className="tri-input" type="date" value={fDia} onChange={(e) => setFDia(e.target.value)} />
                        </div>
                        <div style={{ flex: "0 1 100px" }}>
                          <div className="flab">Hora</div>
                          <input className="tri-input" type="time" step={900} value={fHora} onChange={(e) => setFHora(e.target.value)} />
                        </div>
                      </div>
                      <div className="flab">Projeto / área (opcional)</div>
                      <select className="tri-input" value={fGrupo ?? ""} onChange={(e) => setFGrupo(e.target.value || null)}>
                        <option value="">— nenhum —</option>
                        {containers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.emoji ? `${c.emoji} ` : ""}
                            {c.nome}
                          </option>
                        ))}
                      </select>
                      <div className="modal-foot" style={{ marginTop: 10 }}>
                        <button className="btn ghost" onClick={() => setSelTarefa(null)}>
                          Cancelar
                        </button>
                        <button className="btn primary" onClick={reservar}>
                          Reservar horário ✓
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={t.id}
                      className="backlink"
                      onClick={() => {
                        setSelTarefa(t.id);
                        setFDia(t.prazo && t.prazo > hojeISO() ? t.prazo : hojeISO());
                        setFHora(proximaHora());
                        setFGrupo(t.container_id);
                      }}
                    >
                      <b>☐ {t.titulo}</b>
                      {t.prazo && t.prazo < hojeISO() ? `venceu ${t.prazo.split("-").reverse().slice(0, 2).join("/")} · ` : ""}
                      toque para dar dia e hora
                    </button>
                  ),
                )}
                <div className="modal-foot">
                  <button className="btn primary" onClick={onClose}>
                    Concluir ✓
                  </button>
                </div>
              </>
            ) : (
              <div className="allclear">
                <div className="big">✓</div>
                <h4>Inbox zero · 🔥 {seq + (feitos.length ? 1 : 0) > 1 ? `${seq + (feitos.length ? 1 : 0)} dias` : "sequência começou"}</h4>
                <p>
                  {feitos.length
                    ? `${feitos.length} ${feitos.length === 1 ? "item despachado" : "itens despachados"}. Despacho registrado no seu placar.`
                    : "Dia organizado — bom trabalho."}
                </p>
                <div className="modal-foot" style={{ justifyContent: "center" }}>
                  <button className="btn primary" onClick={onClose}>
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          item && (
            <div className="desp-corpo">
              <aside className="desp-fila" aria-label="Fila do Despacho">
                <div className="plabel">Fila</div>
                <div className="desp-fila-lista">
                  {pendentes.map((it) => (
                    <button key={it.id} className={`desp-fila-item${it.id === item.id ? " on" : ""}`} onClick={() => setCurId(it.id)}>
                      {it.texto.length > 72 ? `${it.texto.slice(0, 70)}…` : it.texto}
                    </button>
                  ))}
                </div>
                <div className="desp-fogo">
                  🔥 <b>{seq > 1 ? `${seq} dias` : seq === 1 ? "feito ontem" : "começa hoje"}</b>
                  {seq > 0 ? ` em sequência. Zere hoje e são ${seq + 1}.` : " — zere a Inbox e comece a sua."}
                </div>
              </aside>

              <div className="desp-central">
                <div
                  className="desp-card"
                  style={swipeX ? { transform: `translateX(${swipeX}px)`, transition: "none" } : undefined}
                  onPointerDown={(e) => {
                    if (e.pointerType === "touch") swipeIni.current = e.clientX;
                  }}
                  onPointerMove={(e) => {
                    if (swipeIni.current !== null) setSwipeX(Math.max(0, e.clientX - swipeIni.current));
                  }}
                  onPointerUp={swipeFim}
                  onPointerCancel={swipeFim}
                >
                  <div className="plabel">Você capturou</div>
                  {editando ? (
                    <input
                      ref={tituloRef}
                      className="tri-input desp-edit"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      onBlur={() => setEditando(false)}
                    />
                  ) : (
                    <button className="desp-capturado" title="Editar o título (E)" onClick={() => { setEditando(true); requestAnimationFrame(() => tituloRef.current?.focus()); }}>
                      “{titulo || item.texto}”
                    </button>
                  )}
                  {item.imagem_path && <CapturaImagem path={item.imagem_path} />}

                  <div className="desp-para">Para onde vai?</div>
                  <div className="desp-destinos">
                    {DESTINOS.map((d, i) => (
                      <button key={d.id} className={`desp-dest ${d.classe}${destino === d.id ? " on" : ""}`} onClick={() => setDestino(d.id)}>
                        <span className="desp-ico">{d.icone}</span>
                        <span className="desp-rot">{d.rotulo}</span>
                        <kbd>{i + 1}</kbd>
                      </button>
                    ))}
                  </div>

                  <div className="desp-params">
                    {(destino === "agendar" || destino === "delegar") && (
                      <div className="desp-param">
                        <div className="flab">{destino === "agendar" ? "Para quando?" : "Cobrar quando?"}</div>
                        <div className="pillrow">
                          {["hoje", "amanhã", "seg"].map((q) => (
                            <button key={q} className={pill(quando === q)} onClick={() => setQuando(q)}>
                              {q}
                            </button>
                          ))}
                          <button className={pill(quando === "escolher")} onClick={() => setQuando("escolher")}>
                            🗓 escolher
                          </button>
                          <button className={pill(quando === null)} onClick={() => setQuando(null)}>
                            sem data
                          </button>
                        </div>
                        {quando === "escolher" && (
                          <input className="tri-input" type="date" value={dataLivre} onChange={(e) => setDataLivre(e.target.value)} autoFocus />
                        )}
                      </div>
                    )}
                    {destino === "delegar" && (
                      <div className="desp-param">
                        <div className="flab">Delegar para</div>
                        <input
                          ref={quemRef}
                          className="tri-input"
                          value={quem}
                          onChange={(e) => setQuem(e.target.value)}
                          placeholder="Nome — vira uma @pessoa sua"
                        />
                      </div>
                    )}
                    {(destino === "agendar" || destino === "nota") && (
                      <div className="desp-param">
                        <div className="flab">
                          Projeto ou área <span className="fraco">(opcional)</span>
                        </div>
                        <div className="pillrow">
                          <button className={pill(containerId === null)} onClick={() => setContainerId(null)}>
                            nenhum
                          </button>
                          {containersDe(["projeto", "area"]).map((c) => (
                            <button key={c.id} className={pill(containerId === c.id)} onClick={() => setContainerId(c.id)}>
                              {c.emoji ? `${c.emoji} ` : c.kind === "projeto" ? "▶ " : "/"}
                              {c.nome}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {destino === "referencia" && (
                      <div className="desp-param">
                        <div className="flab">Guardar em (recurso ou área)</div>
                        <div className="pillrow">
                          <button className={pill(containerId === null)} onClick={() => setContainerId(null)}>
                            sem grupo
                          </button>
                          {containersDe(["recurso", "area"]).map((c) => (
                            <button key={c.id} className={pill(containerId === c.id)} onClick={() => setContainerId(c.id)}>
                              {c.emoji ? `${c.emoji} ` : "◈ "}
                              {c.nome}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {destino === "incubar" && <p className="desp-info">Sai da fila e volta sozinha daqui a 90 dias — sem pesar na cabeça.</p>}
                    {destino === "descartar" && <p className="desp-info">Some de vez. Se voltar a importar, ela volta pela captura.</p>}
                    <button className="desp-cta" onClick={confirmar}>
                      {ctaRotulo} <kbd>⏎</kbd>
                    </button>
                  </div>
                </div>

                <div className="desp-atalhos">
                  <span>
                    <kbd>1–6</kbd> destino
                  </span>
                  <span>
                    <kbd>⏎</kbd> confirma
                  </span>
                  <span>
                    <kbd>E</kbd> editar título
                  </span>
                  <span>
                    <kbd>⌫</kbd> desfazer
                  </span>
                  <span className="desp-jafiz">
                    Já fiz (2 min)? <kbd onClick={jaFiz}>F</kbd>
                  </span>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
