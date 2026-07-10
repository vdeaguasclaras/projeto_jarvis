"use client";

import { hojeISO, type Container, type Tarefa, type TarefaStatus } from "@/lib/db";

type Props = {
  tarefas: Tarefa[];
  containers: Container[];
  logged: boolean;
  onConclude: (id: string) => void;
  onToast: (msg: string) => void;
};

const GRUPOS: [TarefaStatus, string][] = [
  ["a_fazer", "A fazer"],
  ["em_andamento", "Em andamento"],
  ["em_espera", "Em espera"],
  ["algum_dia", "Algum dia"],
  ["concluida", "Concluídas hoje"],
];

function prazoChip(prazo: string | null): { txt: string; late: boolean } | null {
  if (!prazo) return null;
  const hoje = hojeISO();
  const txt = prazo === hoje ? "hoje" : prazo.split("-").reverse().slice(0, 2).join("/");
  return { txt, late: prazo < hoje };
}

export default function TasksView({ tarefas, containers, logged, onConclude, onToast }: Props) {
  const containerDe = (id: string | null) => containers.find((c) => c.id === id) ?? null;
  const hoje = hojeISO();

  if (!logged) {
    return (
      <div className="view-in">
        <div className="soon">
          <h2>Tarefas</h2>
          <p>Entre com seu e-mail para ver suas tarefas reais — elas nascem da triagem da Inbox (check do dia).</p>
          <span className="chip">capturar → organizar → fazer</span>
        </div>
      </div>
    );
  }

  return (
    <div className="view-in gtd">
      {GRUPOS.map(([status, label]) => {
        const itens = tarefas.filter((t) =>
          status === "concluida"
            ? t.status === "concluida" && (t.concluida_em ?? "").slice(0, 10) === hoje
            : t.status === status,
        );
        if (!itens.length && (status === "em_andamento" || status === "algum_dia")) return null;
        return (
          <div key={status}>
            <h3>
              {label} <span className="count">{itens.length}</span>
            </h3>
            {itens.length === 0 && (
              <p className="empty-hint">
                {status === "a_fazer"
                  ? "Nada aqui — capture algo e faça o check do dia."
                  : status === "concluida"
                    ? "Nenhuma concluída hoje ainda."
                    : "Vazio."}
              </p>
            )}
            {itens.map((t) => {
              const pc = prazoChip(t.prazo);
              const cont = containerDe(t.container_id);
              const feita = t.status === "concluida";
              return (
                <div key={t.id} className={`todo${feita ? " done" : ""}`}>
                  <button
                    className="box"
                    role="checkbox"
                    aria-checked={feita}
                    onClick={() => (feita ? onToast("Já concluída ✓") : onConclude(t.id))}
                  >
                    ✓
                  </button>
                  <div className="txt">
                    {t.titulo}
                    <div className="chips">
                      {cont && (
                        <span className="chip">
                          {cont.emoji ? `${cont.emoji} ` : ""}
                          {cont.nome}
                        </span>
                      )}
                      {pc && (
                        <span className="chip muted" style={pc.late ? { color: "var(--today)" } : undefined}>
                          {pc.late ? `venceu ${pc.txt}` : pc.txt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
