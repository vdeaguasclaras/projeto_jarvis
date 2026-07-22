"use client";

/** Pessoas (tela 15c) — tudo que você delegou ou espera de alguém.
 *  Lista à esquerda com badge de pendências e a cobrança mais próxima;
 *  detalhe à direita com "está com ela", histórico e confiabilidade.
 *  Tudo derivado de kairos_tarefas (em espera = delegada; prazo = cobrança). */

import { useMemo, useState } from "react";
import { criarPessoa, hojeISO, somaDias, type Container, type Pessoa, type Tarefa } from "@/lib/db";

type Props = {
  userId: string;
  pessoas: Pessoa[];
  tarefas: Tarefa[];
  containers: Container[];
  onBack: () => void;
  onEditTarefa: (t: Tarefa) => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

/** Paleta cíclica dos avatares (tokens do handoff). */
const AVATAR = [
  { bg: "var(--terracotta-bg)", ink: "var(--terracotta-deep)" },
  { bg: "var(--green-bg)", ink: "var(--green-deep)" },
  { bg: "var(--purple-bg)", ink: "var(--purple-deep)" },
];

function ddmm(iso: string): string {
  return iso.split("-").reverse().slice(0, 2).join("/");
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function rotuloCobranca(prazo: string | null, hoje: string): { txt: string; urgente: boolean } | null {
  if (!prazo) return null;
  if (prazo < hoje) return { txt: `cobrar já — era ${ddmm(prazo)}`, urgente: true };
  if (prazo === hoje) return { txt: "cobrar hoje", urgente: true };
  if (prazo === somaDias(hoje, 1)) return { txt: "cobrar amanhã", urgente: true };
  return { txt: `cobrar ${ddmm(prazo)}`, urgente: false };
}

export default function PessoasPage({ userId, pessoas, tarefas, containers, onBack, onEditTarefa, onChanged, onToast }: Props) {
  const hoje = hojeISO();
  const [selId, setSelId] = useState<string | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);
  const [novoNome, setNovoNome] = useState("");

  const containerDe = (id: string | null) => containers.find((c) => c.id === id) ?? null;

  // Derivados por pessoa: pendências (em espera), cobrança mais próxima, histórico, confiabilidade
  const dados = useMemo(() => {
    const corte = somaDias(hoje, -60);
    return pessoas.map((p, i) => {
      const dela = tarefas.filter((t) => t.responsavel_id === p.id);
      const pendencias = dela
        .filter((t) => t.status === "em_espera")
        .sort((a, b) => (a.prazo ?? "9999") < (b.prazo ?? "9999") ? -1 : 1);
      const cobranca = pendencias.find((t) => t.prazo)?.prazo ?? null;
      const historico = dela
        .filter((t) => t.status === "concluida" && t.concluida_em)
        .sort((a, b) => (a.concluida_em! > b.concluida_em! ? -1 : 1));
      const recentes = historico.filter((t) => t.concluida_em!.slice(0, 10) >= corte);
      const comPrazo = recentes.filter((t) => t.prazo);
      const noPrazo = comPrazo.filter((t) => t.concluida_em!.slice(0, 10) <= t.prazo!);
      const projetos = new Set(dela.map((t) => t.container_id).filter(Boolean));
      return {
        pessoa: p,
        avatar: AVATAR[i % AVATAR.length],
        pendencias,
        cobranca,
        historico,
        entregues: comPrazo.length,
        noPrazo: noPrazo.length,
        projetos: projetos.size,
      };
    });
  }, [pessoas, tarefas, hoje]);

  // Quem tem cobrança mais urgente primeiro; sem pendência por último
  const ordenadas = useMemo(
    () =>
      [...dados].sort((a, b) => {
        if (a.pendencias.length !== b.pendencias.length && (!a.pendencias.length || !b.pendencias.length))
          return a.pendencias.length ? -1 : 1;
        return (a.cobranca ?? "9999") < (b.cobranca ?? "9999") ? -1 : 1;
      }),
    [dados],
  );

  const sel = dados.find((d) => d.pessoa.id === selId) ?? ordenadas[0] ?? null;

  const criarNova = async () => {
    const nome = novoNome.trim().replace(/^@/, "");
    if (!nome) return;
    const id = await criarPessoa(userId, nome);
    setNovoNome("");
    setNovaAberta(false);
    if (!id) return onToast("Não foi possível criar — tente de novo");
    onChanged();
    setSelId(id);
    onToast(`@${nome} agora tem uma página ✓ — delegue com @${nome} na captura`);
  };

  return (
    <div className="view-in">
      <div className="esp-head">
        <button className="esp-breadcrumb" onClick={onBack}>Espaços ›</button>
        <h1>Pessoas</h1>
        <span className="esp-sub">tudo que você delegou ou espera de alguém</span>
        <button className="btn primary esp-novo" onClick={() => setNovaAberta((a) => !a)}>+ Pessoa</button>
      </div>
      {novaAberta && (
        <div className="pp-nova">
          <input
            className="note-search"
            placeholder="Nome — ex.: Ana"
            value={novoNome}
            autoFocus
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") criarNova();
              if (e.key === "Escape") setNovaAberta(false);
            }}
          />
          <button className="btn primary" onClick={criarNova}>Criar</button>
        </div>
      )}

      <div className="pp-grid">
        <div className="pp-lista">
          {ordenadas.length === 0 && (
            <p className="empty-hint">
              Ninguém ainda — pessoas nascem do @nome na captura ou do “Delegar” no Despacho.
            </p>
          )}
          {ordenadas.map((d) => {
            const rc = rotuloCobranca(d.cobranca, hoje);
            const ativa = sel?.pessoa.id === d.pessoa.id;
            return (
              <button
                key={d.pessoa.id}
                className={`pp-card${rc?.urgente && d.pendencias.length ? " urgente" : ""}${ativa ? " ativa" : ""}`}
                onClick={() => setSelId(d.pessoa.id)}
              >
                <span className="pp-ava" style={{ background: d.avatar.bg, color: d.avatar.ink }}>
                  {iniciais(d.pessoa.nome)}
                </span>
                <span className="pp-quem">
                  <b>@{d.pessoa.nome}</b>
                  <small className={rc?.urgente && d.pendencias.length ? "urgente" : undefined}>
                    {d.pendencias.length ? (rc?.txt ?? "sem data de cobrança") : "em dia"}
                  </small>
                </span>
                {d.pendencias.length > 0 && (
                  <span className={`pp-badge${rc?.urgente ? " quente" : ""}`}>{d.pendencias.length}</span>
                )}
              </button>
            );
          })}
          <div className="esp-dica">
            Delegar sem data de cobrança é esquecer com etapas. O Kairós sempre pede uma data.
          </div>
        </div>

        {sel && (
          <div className="pp-detalhe">
            <div className="pp-det-head">
              <span className="pp-ava grande" style={{ background: sel.avatar.bg, color: sel.avatar.ink }}>
                {sel.pessoa.nome.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <div className="pp-nome">@{sel.pessoa.nome}</div>
                <div className="pp-meta">
                  {sel.projetos > 0
                    ? `em ${sel.projetos} ${sel.projetos === 1 ? "grupo" : "grupos"}`
                    : "sem tarefas vinculadas ainda"}
                </div>
              </div>
            </div>

            <div className="pp-sec">Está com {sel.pessoa.nome.split(" ")[0]}</div>
            {sel.pendencias.length === 0 && <p className="empty-hint">Nada — em dia ✓</p>}
            {sel.pendencias.map((t) => {
              const rc = rotuloCobranca(t.prazo, hoje);
              const cont = containerDe(t.container_id);
              return (
                <button key={t.id} className="pp-pend" onClick={() => onEditTarefa(t)} title="Abrir a tarefa">
                  <div className="pp-pend-l1">
                    <span className="pp-hour">⏳</span>
                    <span className="pp-pend-t">{t.titulo}</span>
                    {rc ? (
                      <span className={`tchip${rc.urgente ? " hoje" : ""}`}>{rc.txt}</span>
                    ) : (
                      <span className="tchip">sem data de cobrança</span>
                    )}
                  </div>
                  <div className="pp-pend-l2">
                    delegada {ddmm(t.criada_em.slice(0, 10))}
                    {cont ? ` · ${cont.kind === "projeto" ? "▶" : "▣"} ${cont.nome}` : ""}
                    {" · "}
                    <span className="pp-cobrar">cobrar agora →</span>
                  </div>
                </button>
              );
            })}

            <div className="pp-sec">Histórico recente</div>
            {sel.historico.length === 0 && <p className="empty-hint">Nenhuma entrega registrada ainda.</p>}
            {sel.historico.slice(0, 4).map((t) => (
              <div key={t.id} className="pp-hist">
                <span className="ok">✓</span> {t.titulo} — entregue {ddmm(t.concluida_em!.slice(0, 10))}
                {t.prazo ? (t.concluida_em!.slice(0, 10) <= t.prazo ? ", no prazo" : `, prazo era ${ddmm(t.prazo)}`) : ""}
              </div>
            ))}

            {sel.entregues > 0 && (
              <div className={`pp-conf${sel.noPrazo / sel.entregues >= 0.7 ? "" : " atencao"}`}>
                {sel.pessoa.nome.split(" ")[0]} entregou <b>{sel.noPrazo} de {sel.entregues}</b> no prazo nos últimos 2
                meses.{" "}
                {sel.noPrazo / sel.entregues >= 0.7
                  ? "Confiável para o que tem data. ✓"
                  : "Combine prazos com folga — ou cobre antes."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
