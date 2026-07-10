"use client";

import { useState } from "react";
import {
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
} from "@/lib/db";
import { parseCapture } from "@/lib/parser";

type Step = "cls" | "sim2" | "deleg" | "acao" | "nao" | "ref";

type Props = {
  userId: string;
  items: InboxItem[];
  containers: Container[];
  onClose: () => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

/** Triagem GTD/CODE do check do dia — o fluxo do protótipo v6, agora sobre dados reais. */
export default function TriageModal({ userId, items, containers, onClose, onChanged, onToast }: Props) {
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<Step>("cls");
  const [feitos, setFeitos] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [containerId, setContainerId] = useState<string | null>(null);
  const [quando, setQuando] = useState<string | null>("amanhã");
  const [quem, setQuem] = useState("");

  const item = items[idx];
  const done = idx >= items.length;

  const next = async (msg: string) => {
    onToast(msg);
    setFeitos((f) => f + 1);
    setStep("cls");
    setTitulo("");
    setContainerId(null);
    setQuando("amanhã");
    setQuem("");
    if (idx + 1 >= items.length) {
      await registrarRitual(userId, "check_dia", { triados: items.length });
    }
    setIdx((i) => i + 1);
    onChanged();
  };

  const goAcao = () => {
    setTitulo(parseCapture(item.texto).title);
    setStep("acao");
  };

  const fazerAgora = async () => {
    await criarTarefa(userId, { titulo: parseCapture(item.texto).title, concluida: true });
    await marcarTriado(item.id);
    await next("Registrada como feita ✓ (regra dos 2 minutos) — soma no placar de hoje");
  };

  const fazerHoje = async () => {
    await criarTarefa(userId, { titulo: parseCapture(item.texto).title, status: "a_fazer", prazo: hojeISO() });
    await marcarTriado(item.id);
    await next("Na sua lista de hoje ✓ — veja na visão Tarefas");
  };

  const delegar = async () => {
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
    await criarNota(userId, item.texto.slice(0, 80), item.texto, comoNota ? null : containerId);
    await marcarTriado(item.id);
    const c = containers.find((x) => x.id === containerId);
    await next(comoNota ? "Nota criada — expressar ✎" : `Referência guardada${c ? ` em "${c.nome}"` : ""} ✓`);
  };

  const incubar = async () => {
    const volta = await incubarItem(item.id);
    await next(`Incubada ⏳ — volta à Inbox em ${volta.split("-").reverse().join("/")}`);
  };

  const descartar = async () => {
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

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label="Check do dia">
          <div className="modal-pad">
            <h2>Check do dia</h2>
            <p className="sub">Triagem da Inbox, um item por vez · fluxo GTD dentro do Organizar (CODE)</p>

            {done ? (
              <div className="allclear">
                <div className="big">✓</div>
                <h4>Inbox zero · +10 pontos</h4>
                <p>{feitos} itens triados. Check do dia registrado no seu placar.</p>
                <div className="modal-foot" style={{ justifyContent: "center" }}>
                  <button className="btn primary" onClick={onClose}>
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <div className="triage-card" key={`${item.id}-${step}`}>
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
                        <b>Incubar ⏳</b>amadurecer
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
                  {idx + 1} de {items.length}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
