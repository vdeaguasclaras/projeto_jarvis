"use client";

import { useMemo, useState } from "react";
import {
  agendarTarefa,
  criarNota,
  criarPessoa,
  criarTarefa,
  hojeISO,
  incubarItem,
  marcarTriado,
  registrarRitual,
  resolvePrazo,
  type Container,
  type Evento,
  type InboxItem,
  type Tarefa,
} from "@/lib/db";
import { parseCapture } from "@/lib/parser";
import { isoDe } from "@/components/TimeGrid";

type Step = "cls" | "sim2" | "deleg" | "acao" | "nao" | "ref";

type Props = {
  userId: string;
  items: InboxItem[];
  containers: Container[];
  /** tarefas de hoje (ou vencidas) ainda sem horário — etapa final do check */
  tarefasSemHorario: Tarefa[];
  /** eventos de hoje, para propor horários realmente livres */
  eventosHoje: Evento[];
  onClose: () => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

/** Vagas livres de 1h entre 8h e 18h de hoje, descontando os eventos. */
function vagasDeHoje(eventos: Evento[]): number[] {
  const ocupadas = eventos.map((e) => {
    const i = new Date(e.inicio);
    const f = new Date(e.fim);
    return [i.getHours() + i.getMinutes() / 60, f.getHours() + f.getMinutes() / 60] as [number, number];
  });
  const agora = new Date();
  const minimo = agora.getHours() + 1; // só horários ainda por vir
  const livres: number[] = [];
  for (let h = 8; h <= 17; h++) {
    if (h < minimo) continue;
    if (!ocupadas.some(([i, f]) => h < f && h + 1 > i)) livres.push(h);
  }
  return livres;
}

/** Triagem GTD/CODE do check do dia — fluxo do protótipo v6 sobre dados reais.
 *  Refinos do Raul: escolher qual item triar (menu) e, com a Inbox zerada,
 *  dar horário às tarefas de hoje que ainda não têm (elas saem da bandeja). */
export default function TriageModal({
  userId,
  items,
  containers,
  tarefasSemHorario,
  eventosHoje,
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

  // ── etapa final: horários para as tarefas de hoje ──
  const vagas = useMemo(() => vagasDeHoje(eventosHoje), [eventosHoje]);
  // O Kairós propõe: distribui as vagas livres em sequência; o usuário decide
  const [horas, setHoras] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(tarefasSemHorario.map((t, i) => [t.id, vagasDeHoje(eventosHoje)[i] ?? null])),
  );
  const [agendadas, setAgendadas] = useState(false);

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
    await criarTarefa(userId, { titulo: parseCapture(item.texto).title, concluida: true });
    await marcarTriado(item.id);
    await next("Registrada como feita ✓ (regra dos 2 minutos) — soma no placar de hoje");
  };

  const fazerHoje = async () => {
    if (!item) return;
    await criarTarefa(userId, { titulo: parseCapture(item.texto).title, status: "a_fazer", prazo: hojeISO() });
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

  const aplicarHorarios = async () => {
    const hoje = hojeISO();
    let n = 0;
    for (const t of tarefasSemHorario) {
      const h = horas[t.id];
      if (h == null) continue;
      const dur = (t.duracao_min ?? 60) / 60;
      await agendarTarefa(t.id, isoDe(hoje, h), isoDe(hoje, h + dur), hoje);
      n++;
    }
    setAgendadas(true);
    onChanged();
    onToast(n ? `${n} tarefa${n > 1 ? "s" : ""} com horário reservado no dia ✓` : "Tudo certo — ficam na lista, sem horário");
  };

  const pill = (on: boolean) => `pill-opt${on ? " on" : ""}`;
  const back = (
    <button className="tri-back" onClick={() => setStep("cls")}>
      ← voltar à classificação
    </button>
  );
  const containersDe = (kinds: string[]) => containers.filter((c) => kinds.includes(c.kind));

  const semHorarioPendentes = tarefasSemHorario.length > 0 && !agendadas;

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
                      Agora, o dia: {tarefasSemHorario.length} tarefa{tarefasSemHorario.length > 1 ? "s" : ""} para hoje ainda sem
                      horário. O Kairós propõe vagas livres — você decide.
                    </p>
                  </div>
                  {tarefasSemHorario.map((t) => (
                    <div key={t.id}>
                      <div className="flab">{t.titulo}</div>
                      <div className="pillrow">
                        {vagas.slice(0, 4).map((h) => (
                          <button
                            key={h}
                            className={pill(horas[t.id] === h)}
                            onClick={() => setHoras((prev) => ({ ...prev, [t.id]: h }))}
                          >
                            {h}h
                          </button>
                        ))}
                        <button
                          className={`pill-opt warm${horas[t.id] == null ? " on" : ""}`}
                          onClick={() => setHoras((prev) => ({ ...prev, [t.id]: null }))}
                        >
                          sem horário
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="modal-foot">
                    <button className="btn primary" onClick={aplicarHorarios}>
                      Reservar horários ✓
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
