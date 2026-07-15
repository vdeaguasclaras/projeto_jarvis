"use client";

import { useState } from "react";
import { hojeISO, type Container, type PrioEscolha, type Tarefa } from "@/lib/db";

/** Escolha de até 3 prioridades — o Kairós propõe, você decide (regra do produto).
 *  Novo (pedido do Raul): as sugestões aparecem primeiro; qualquer outra tarefa
 *  entra pelo menu suspenso; e dá para criar uma prioridade avulsa, só texto
 *  (ex.: "preparação para a reunião"), sem virar tarefa. */

type Sel = { key: string; tarefa_id: string | null; titulo: string; feita: boolean };

type Props = {
  titulo: string;
  sub: string;
  tarefas: Tarefa[]; // candidatas abertas, já ordenadas por prazo
  sugeridas: string[]; // ids que o Kairós propõe
  atuais: PrioEscolha[]; // o que está salvo hoje
  containers: Container[];
  onSave: (escolhas: PrioEscolha[]) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
};

export default function PrioModal({ titulo, sub, tarefas, sugeridas, atuais, containers, onSave, onClose, onToast }: Props) {
  const [sel, setSel] = useState<Sel[]>(() =>
    atuais.length
      ? atuais.flatMap((a): Sel[] => {
          if (a.tarefa_id) {
            const t = tarefas.find((x) => x.id === a.tarefa_id);
            return t ? [{ key: `t:${t.id}`, tarefa_id: t.id, titulo: t.titulo, feita: false }] : [];
          }
          return a.titulo ? [{ key: `a:${a.titulo}`, tarefa_id: null, titulo: a.titulo, feita: a.feita ?? false }] : [];
        })
      : sugeridas
          .map((id) => tarefas.find((t) => t.id === id))
          .filter((t): t is Tarefa => !!t)
          .slice(0, 3)
          .map((t) => ({ key: `t:${t.id}`, tarefa_id: t.id, titulo: t.titulo, feita: false })),
  );
  const [avulsa, setAvulsa] = useState("");
  const hoje = hojeISO();

  const cabe = (): boolean => {
    if (sel.length < 3) return true;
    onToast("Máximo de 3 prioridades — tire uma antes");
    return false;
  };

  const addTarefa = (t: Tarefa) => {
    if (sel.some((s) => s.tarefa_id === t.id)) return;
    if (!cabe()) return;
    setSel((prev) => [...prev, { key: `t:${t.id}`, tarefa_id: t.id, titulo: t.titulo, feita: false }]);
  };

  const addAvulsa = () => {
    const txt = avulsa.trim();
    if (!txt) return;
    if (!cabe()) return;
    setSel((prev) => [...prev, { key: `a:${txt}:${prev.length}`, tarefa_id: null, titulo: txt, feita: false }]);
    setAvulsa("");
  };

  const tirar = (key: string) => setSel((prev) => prev.filter((s) => s.key !== key));

  const emojiDe = (t: Tarefa) => containers.find((c) => c.id === t.container_id)?.emoji;
  const sugestoes = sugeridas.map((id) => tarefas.find((t) => t.id === id)).filter((t): t is Tarefa => !!t);
  const foraDaSelecao = tarefas.filter((t) => !sel.some((s) => s.tarefa_id === t.id));

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal-wrap">
        <div className="modal open" role="dialog" aria-label={titulo}>
          <div className="modal-pad">
            <h2>★ {titulo}</h2>
            <p className="sub">{sub}</p>

            <div className="flab" style={{ marginTop: 0 }}>Escolhidas ({sel.length} de 3)</div>
            {sel.length === 0 && <p className="empty-hint">Nenhuma ainda — aceite uma sugestão ou escreva a sua.</p>}
            <div className="pillrow" style={{ gap: 6 }}>
              {sel.map((s) => (
                <span key={s.key} className="pill-opt on" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {s.tarefa_id ? "" : "✎ "}
                  {s.titulo}
                  <button aria-label={`Tirar ${s.titulo}`} style={{ color: "inherit", fontWeight: 700 }} onClick={() => tirar(s.key)}>
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {sugestoes.length > 0 && (
              <>
                <div className="flab">O Kairós sugere (prazo mais perto primeiro)</div>
                <div className="pillrow" style={{ gap: 6 }}>
                  {sugestoes
                    .filter((t) => !sel.some((s) => s.tarefa_id === t.id))
                    .map((t) => (
                      <button key={t.id} className="pill-opt" onClick={() => addTarefa(t)}>
                        + {emojiDe(t) ? `${emojiDe(t)} ` : ""}
                        {t.titulo}
                        {t.prazo && t.prazo < hoje ? " · venceu" : t.prazo === hoje ? " · hoje" : ""}
                      </button>
                    ))}
                </div>
              </>
            )}

            <div className="flab">Outra tarefa qualquer</div>
            <select
              className="tri-input"
              value=""
              onChange={(e) => {
                const t = tarefas.find((x) => x.id === e.target.value);
                if (t) addTarefa(t);
              }}
            >
              <option value="">— escolher da lista ({foraDaSelecao.length}) —</option>
              {foraDaSelecao.map((t) => (
                <option key={t.id} value={t.id}>
                  {emojiDe(t) ? `${emojiDe(t)} ` : ""}
                  {t.titulo}
                  {t.prazo ? ` · ${t.prazo.split("-").reverse().slice(0, 2).join("/")}` : ""}
                </option>
              ))}
            </select>

            <div className="flab">Ou uma prioridade avulsa — não precisa ser tarefa</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                className="tri-input"
                value={avulsa}
                onChange={(e) => setAvulsa(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAvulsa()}
                placeholder="ex.: preparação para a reunião das 14h"
              />
              <button className="btn-newnote" onClick={addAvulsa}>
                +
              </button>
            </div>

            <div className="modal-foot">
              <button className="btn ghost" onClick={onClose}>
                Cancelar
              </button>
              <button
                className="btn primary"
                onClick={() => onSave(sel.map((s) => ({ tarefa_id: s.tarefa_id, titulo: s.tarefa_id ? null : s.titulo, feita: s.feita })))}
              >
                Salvar {sel.length ? `(${sel.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
