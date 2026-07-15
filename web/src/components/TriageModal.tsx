"use client";

import { useState } from "react";
import {
  agendarTarefa,
  atualizarTarefa,
  criarNota,
  criarPessoa,
  criarTarefa,
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

type Step = "cls" | "sim2" | "deleg" | "acao" | "nao" | "ref";

type Props = {
  userId: string;
  items: InboxItem[];
  containers: Container[];
  /** tarefas de hoje (ou vencidas) ainda sem horário — etapa final do check */
  tarefasSemHorario: Tarefa[];
  onClose: () => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

/** Próxima hora cheia (mínimo 8h, máximo 22h) — palpite inicial do formulário. */
function proximaHora(): string {
  const h = Math.min(Math.max(new Date().getHours() + 1, 8), 22);
  return `${String(h).padStart(2, "0")}:00`;
}

/** Triagem GTD/CODE do check do dia — fluxo do protótipo v6 sobre dados reais.
 *  Refinos do Raul: escolher qual item triar (menu) e, com a Inbox zerada,
 *  dar horário às tarefas de hoje que ainda não têm (elas saem da bandeja). */
export default function TriageModal({
  userId,
  items,
  containers,
  tarefasSemHorario,
  onClose,
  onChanged,
  onToast,
}: Props) {
  const [feitos, setFeitos] = useState<string[]>([]);
  const pendentes = items.filter((it) => !feitos.includes(it.id));
  const [curId, setCurId] = useState<string | null>(pendentes[0]?.id ?? null);
  const [step, setStep] = useState<Step>("cls");
  const [titulo, setTitulo] = useState("");
  const [containerId, setContainerId] = useState<string | null>(null);
  const [quando, setQuando] = useState<string | null>("amanhã");
  const [quem, setQuem] = useState("");

  const item = pendentes.find((it) => it.id === curId) ?? pendentes[0] ?? null;
  const inboxZerada = pendentes.length === 0;

  // ── etapa final: escolher tarefa e atribuir dia, hora e grupo ──
  const [agendadasIds, setAgendadasIds] = useState<string[]>([]);
  const [selTarefa, setSelTarefa] = useState<string | null>(null);
  const [fDia, setFDia] = useState(hojeISO());
  const [fHora, setFHora] = useState(proximaHora());
  const [fGrupo, setFGrupo] = useState<string | null>(null);
  const tarefasPendentes = tarefasSemHorario.filter((t) => !agendadasIds.includes(t.id));

  const escolherTarefa = (t: Tarefa) => {
    setSelTarefa(t.id);
    setFDia(t.prazo && t.prazo > hojeISO() ? t.prazo : hojeISO());
    setFHora(proximaHora());
    setFGrupo(t.container_id);
  };

  const reservar = async () => {
    const t = tarefasPendentes.find((x) => x.id === selTarefa);
    if (!t || !fDia || !fHora) return;
    const [hh, mm] = fHora.split(":").map(Number);
    const h = (hh || 0) + (mm || 0) / 60;
    const dur = (t.duracao_min ?? 60) / 60;
    const err = await agendarTarefa(t.id, isoDe(fDia, h), isoDe(fDia, h + dur), fDia);
    if (err) {
      onToast(`Erro ao reservar: ${err}`);
      return;
    }
    if (fGrupo !== t.container_id) await atualizarTarefa(t.id, { container_id: fGrupo });
    setAgendadasIds((prev) => [...prev, t.id]);
    setSelTarefa(null);
    onChanged();
    onToast(`"${t.titulo.slice(0, 40)}" reservada para ${fDia.split("-").reverse().slice(0, 2).join("/")} às ${fHora} ✓`);
  };

  const next = async (msg: string) => {
    if (!item) return;
    onToast(msg);
    const novosFeitos = [...feitos, item.id];
    setFeitos(novosFeitos);
    const resta = items.filter((it) => !novosFeitos.includes(it.id));
    setCurId(resta[0]?.id ?? null);
    setStep("cls");
    setTitulo("");
    setContainerId(null);
    setQuando("amanhã");
    setQuem("");
    if (!resta.length) {
      await registrarRitual(userId, "check_dia", { triados: items.length });
    }
    onChanged();
  };

  const goAcao = () => {
    if (!item) return;
    setTitulo(parseCapture(item.texto).title);
    setStep("acao");
  };

  const fazerAgora = async () => {
    if (!item) return;
    await criarTarefa(userId, { titulo: parseCapture(item.texto).title, concluida: true, imagem_path: item.imagem_path });
    await marcarTriado(item.id);
    await next("Registrada como feita ✓ (regra dos 2 minutos) — soma no placar de hoje");
  };

  const fazerHoje = async () => {
    if (!item) return;
    await criarTarefa(userId, { titulo: parseCapture(item.texto).title, status: "a_fazer", prazo: hojeISO(), imagem_path: item.imagem_path });
    await marcarTriado(item.id);
    await next("Na sua lista de hoje ✓ — veja na visão Tarefas");
  };

  const delegar = async () => {
    if (!item) return;
    const nome = quem.trim() || "alguém";
    const pessoaId = await criarPessoa(userId, nome);
    await criarTarefa(userId, {
      titulo: parseCapture(item.texto).title,
      status: "em_espera",
      prazo: resolvePrazo(quando),
      responsavel_id: pessoaId,
      descricao: `Delegada para @${nome}`,
      imagem_path: item.imagem_path,
    });
    await marcarTriado(item.id);
    await next(`Delegada para @${nome} — acompanhando em "Em espera"`);
  };

  const planejar = async () => {
    if (!item) return;
    await criarTarefa(userId, {
      titulo: titulo.trim() || parseCapture(item.texto).title,
      status: "a_fazer",
      prazo: resolvePrazo(quando),
      container_id: containerId,
      imagem_path: item.imagem_path,
    });
    await marcarTriado(item.id);
    const c = containers.find((x) => x.id === containerId);
    await next(`Tarefa criada${c ? ` em "${c.nome}"` : ""} ✓`);
  };

  const guardar = async (comoNota: boolean) => {
    if (!item) return;
    await criarNota(userId, item.texto.slice(0, 80), item.texto, comoNota ? null : containerId);
    await marcarTriado(item.id);
    const c = containers.find((x) => x.id === containerId);
    await next(comoNota ? "Nota criada — expressar ✎" : `Referência guardada${c ? ` em "${c.nome}"` : ""} ✓`);
  };

  const incubar = async () => {
    if (!item) return;
    const volta = await incubarItem(item.id);
    await next(`Incubada ⏳ — volta à Inbox em ${volta.split("-").reverse().join("/")}`);
  };

  const descartar = async () => {
    if (!item) return;
    await marcarTriado(item.id);
    await next("Descartada — sem dó");
  };

  const pill = (on: boolean) => `pill-opt${on ? " on" : ""}`;
  const back = (
    <button className="tri-back" onClick={() => setStep("cls")}>
      ← voltar à classificação
    </button>
  );
  const containersDe = (kinds: string[]) => containers.filter((c) => kinds.includes(c.kind));

  const semHorarioPendentes = tarefasPendentes.length > 0;

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label="Check do dia">
          <div className="modal-pad">
            <h2>Check do dia</h2>
            <p className="sub">Triagem da Inbox, um item por vez · fluxo GTD dentro do Organizar (CODE)</p>

            {inboxZerada ? (
              semHorarioPendentes ? (
                <div>
                  <div className="allclear" style={{ padding: "10px 10px 4px" }}>
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
                      <button key={t.id} className="backlink" onClick={() => escolherTarefa(t)}>
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
                </div>
              ) : (
                <div className="allclear">
                  <div className="big">✓</div>
                  <h4>Inbox zero · +10 pontos</h4>
                  <p>
                    {feitos.length
                      ? `${feitos.length} ${feitos.length === 1 ? "item triado" : "itens triados"}. Check do dia registrado no seu placar.`
                      : "Dia organizado — bom trabalho."}
                  </p>
                  <div className="modal-foot" style={{ justifyContent: "center" }}>
                    <button className="btn primary" onClick={onClose}>
                      Fechar
                    </button>
                  </div>
                </div>
              )
            ) : (
              item && (
                <div className="triage-card" key={`${item.id}-${step}`}>
                  {pendentes.length > 1 && (
                    <select
                      className="tri-input tri-select"
                      value={item.id}
                      onChange={(e) => {
                        setCurId(e.target.value);
                        setStep("cls");
                      }}
                      aria-label="Escolher qual item triar"
                    >
                      {pendentes.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.texto.length > 64 ? `${it.texto.slice(0, 62)}…` : it.texto}
                        </option>
                      ))}
                    </select>
                  )}
                  {step !== "cls" && back}
                  <div className="triage-title">{item.texto}</div>
                  {item.imagem_path && <CapturaImagem path={item.imagem_path} />}

                  {step === "cls" && (
                    <>
                      <div className="flab">É acionável?</div>
                      <div className="tri-cls" style={{ gridTemplateColumns: "1fr 1fr" }}>
                        <button className="tri-btn" onClick={() => setStep("sim2")}>
                          <b>É acionável ✓</b>tem uma próxima ação
                        </button>
                        <button className="tri-btn" onClick={() => setStep("nao")}>
                          <b>Não é acionável</b>referência, ideia ou nada
                        </button>
                      </div>
                      <div className="tri-sec">
                        <button className="tri-btn warm" onClick={incubar}>
                          <b>Incubar ⏳</b>
                        </button>
                        <button className="tri-btn" onClick={descartar}>
                          <b>Descartar ✕</b>
                        </button>
                      </div>
                    </>
                  )}

                  {step === "sim2" && (
                    <>
                      <div className="flab">Quando você resolve isto?</div>
                      <div className="tri-cls" style={{ gridTemplateColumns: "1fr 1fr" }}>
                        <button className="tri-btn" onClick={fazerHoje}>
                          <b>Fazer hoje</b>entra na lista de hoje
                        </button>
                        <button className="tri-btn" onClick={fazerAgora}>
                          <b>Já fiz agora ✓</b>menos de 2 min — só registra
                        </button>
                        <button className="tri-btn" onClick={() => setStep("deleg")}>
                          <b>Delegar</b>outra pessoa encaminha
                        </button>
                        <button className="tri-btn" onClick={goAcao}>
                          <b>Planejar</b>destilar: projeto, quando
                        </button>
                      </div>
                    </>
                  )}

                  {step === "deleg" && (
                    <>
                      <div className="flab">Delegar para</div>
                      <input
                        className="tri-input"
                        value={quem}
                        onChange={(e) => setQuem(e.target.value)}
                        placeholder="Nome — vira uma @pessoa sua"
                        autoFocus
                      />
                      <div className="flab">Cobrar quando?</div>
                      <div className="pillrow">
                        {["amanhã", "seg", null].map((q) => (
                          <button key={String(q)} className={pill(quando === q)} onClick={() => setQuando(q)}>
                            {q ?? "sem data"}
                          </button>
                        ))}
                      </div>
                      <div className="modal-foot">
                        <button className="btn primary" onClick={delegar}>
                          Delegar ✓
                        </button>
                      </div>
                    </>
                  )}

                  {step === "acao" && (
                    <>
                      <div className="flab">Destilar — deixe acionável</div>
                      <input className="tri-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
                      <div className="flab">Projeto ou área (opcional)</div>
                      <div className="pillrow">
                        <button className={pill(containerId === null)} onClick={() => setContainerId(null)}>
                          Nenhum
                        </button>
                        {containersDe(["projeto", "area"]).map((c) => (
                          <button key={c.id} className={pill(containerId === c.id)} onClick={() => setContainerId(c.id)}>
                            {c.emoji ? `${c.emoji} ` : ""}
                            {c.nome}
                          </button>
                        ))}
                      </div>
                      <div className="flab">Quando</div>
                      <div className="pillrow">
                        {["hoje", "amanhã", "seg", null].map((q) => (
                          <button key={String(q)} className={pill(quando === q)} onClick={() => setQuando(q)}>
                            {q ?? "sem data"}
                          </button>
                        ))}
                      </div>
                      <div className="modal-foot">
                        <button className="btn primary" onClick={planejar}>
                          Criar tarefa ✓
                        </button>
                      </div>
                    </>
                  )}

                  {step === "nao" && (
                    <>
                      <div className="flab">O que é, então?</div>
                      <div className="tri-cls">
                        <button className="tri-btn" onClick={() => setStep("ref")}>
                          <b>Referência</b>guardar no PARA
                        </button>
                        <button className="tri-btn" onClick={() => guardar(true)}>
                          <b>Vira nota</b>expressar uma ideia
                        </button>
                        <button className="tri-btn warm" onClick={incubar}>
                          <b>Incubar ⏳</b>
                        </button>
                      </div>
                    </>
                  )}

                  {step === "ref" && (
                    <>
                      <div className="flab">Guardar em (recurso ou área)</div>
                      <div className="pillrow">
                        <button className={pill(containerId === null)} onClick={() => setContainerId(null)}>
                          Sem grupo
                        </button>
                        {containersDe(["recurso", "area"]).map((c) => (
                          <button key={c.id} className={pill(containerId === c.id)} onClick={() => setContainerId(c.id)}>
                            {c.emoji ? `${c.emoji} ` : ""}
                            {c.nome}
                          </button>
                        ))}
                      </div>
                      <div className="modal-foot">
                        <button className="btn primary" onClick={() => guardar(false)}>
                          Guardar referência ✓
                        </button>
                      </div>
                    </>
                  )}

                  <div className="triage-progress">
                    {feitos.length + 1} de {items.length}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
