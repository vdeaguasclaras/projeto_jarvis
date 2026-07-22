"use client";

/** Arquivo (tela 15d) — nada se perde: busca com destaque, filtros por tipo,
 *  ↩ Restaurar na própria linha e os incubados com a data em que voltam
 *  sozinhos ao Despacho (incubada_ate). */

import { useMemo, useState } from "react";
import { desarquivarContainer, desincubarItem, type Container, type Incubado, type Kind } from "@/lib/db";
import { normalizar } from "@/lib/parser";

type Filtro = "tudo" | Kind | "incubados";

type Props = {
  arquivados: Container[];
  incubados: Incubado[];
  onBack: () => void;
  onOpen: (id: string) => void;
  onChanged: () => void;
  onToast: (msg: string) => void;
};

const KIND_LABEL: Record<Kind, string> = { projeto: "projeto", area: "área", recurso: "recurso" };
const KIND_ICO: Record<Kind, { ch: string; bg: string; ink: string }> = {
  projeto: { ch: "▶", bg: "var(--terracotta-bg)", ink: "var(--terracotta-deep)" },
  area: { ch: "▣", bg: "var(--green-bg)", ink: "var(--green-deep)" },
  recurso: { ch: "◆", bg: "var(--purple-bg)", ink: "var(--purple-deep)" },
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function ddmm(iso: string): string {
  return iso.split("-").reverse().slice(0, 2).join("/");
}

function mesDe(iso: string): string {
  return MESES[Number(iso.slice(5, 7)) - 1] ?? iso;
}

/** Título com o trecho buscado em <mark> (highlight da 15d). */
function Realce({ texto, busca }: { texto: string; busca: string }) {
  if (!busca) return <>{texto}</>;
  const idx = normalizar(texto).indexOf(normalizar(busca));
  if (idx < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, idx)}
      <mark>{texto.slice(idx, idx + busca.length)}</mark>
      {texto.slice(idx + busca.length)}
    </>
  );
}

export default function ArquivoPage({ arquivados, incubados, onBack, onOpen, onChanged, onToast }: Props) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("tudo");

  const bate = (s: string) => !busca || normalizar(s).includes(normalizar(busca));
  const conts = useMemo(
    () => arquivados.filter((c) => bate(c.nome)).filter((c) => filtro === "tudo" || filtro === c.kind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arquivados, busca, filtro],
  );
  const incs = useMemo(
    () => incubados.filter((i) => bate(i.texto)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incubados, busca],
  );
  const mostraIncubados = filtro === "tudo" || filtro === "incubados";
  const total = conts.length + (mostraIncubados ? incs.length : 0);

  const contar = (f: Filtro) =>
    f === "tudo"
      ? arquivados.length + incubados.length
      : f === "incubados"
        ? incubados.length
        : arquivados.filter((c) => c.kind === f).length;

  const restaurar = async (c: Container) => {
    const err = await desarquivarContainer(c.id);
    if (err) return onToast(`Erro ao restaurar: ${err}`);
    onChanged();
    onToast(`"${c.nome}" de volta à ativa ✓`);
  };

  const acordar = async (i: Incubado) => {
    await desincubarItem(i.id);
    onChanged();
    onToast("De volta à Inbox — aparece no próximo Despacho ✓");
  };

  const FILTROS: [Filtro, string][] = [
    ["tudo", "Tudo"],
    ["projeto", "Projetos"],
    ["area", "Áreas"],
    ["recurso", "Recursos"],
    ["incubados", "Incubados"],
  ];

  return (
    <div className="view-in">
      <div className="esp-head">
        <button className="esp-breadcrumb" onClick={onBack}>Espaços ›</button>
        <h1>Arquivo</h1>
        <input
          className="esp-busca"
          placeholder="⌕ Buscar no arquivo…"
          value={busca}
          autoFocus
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <div className="arq-filtros">
        {FILTROS.map(([f, label]) => (
          <button key={f} className={`fchip${filtro === f ? " on" : ""}`} onClick={() => setFiltro(f)}>
            {label} · {contar(f)}
          </button>
        ))}
      </div>

      {busca && <p className="arq-resultados">{total} resultado{total !== 1 ? "s" : ""} para “{busca}”</p>}
      {total === 0 && !busca && (
        <p className="empty-hint" style={{ marginTop: 12 }}>
          Nada aqui ainda — arquive projetos concluídos na página deles; incubados do Despacho também moram aqui.
        </p>
      )}

      {conts.map((c) => {
        const ico = KIND_ICO[c.kind];
        return (
          <div key={c.id} className="arq-row">
            <span className="arq-ico" style={{ background: ico.bg, color: ico.ink }}>{c.emoji ?? ico.ch}</span>
            <div className="arq-txt">
              <div className="arq-t"><Realce texto={c.nome} busca={busca} /></div>
              <small>
                {KIND_LABEL[c.kind]}
                {c.arquivado_em ? ` · arquivado em ${ddmm(c.arquivado_em.slice(0, 10))}` : ""}
              </small>
            </div>
            <button className="arq-btn restaurar" onClick={() => restaurar(c)}>↩ Restaurar</button>
            <button className="arq-btn" onClick={() => onOpen(c.id)}>abrir</button>
          </div>
        );
      })}

      {mostraIncubados &&
        incs.map((i) => (
          <div key={i.id} className="arq-row">
            <span className="arq-ico" style={{ background: "var(--warning-bg)", color: "var(--warning-ink)" }}>⏳</span>
            <div className="arq-txt">
              <div className="arq-t"><Realce texto={i.texto} busca={busca} /></div>
              <small>incubado · volta ao Despacho em {ddmm(i.incubada_ate)}</small>
            </div>
            <button className="arq-btn restaurar" onClick={() => acordar(i)}>↩ Acordar agora</button>
          </div>
        ))}

      {incubados.length > 0 && filtro === "tudo" && !busca && (
        <div className="arq-strip">
          <span>⏳</span>
          <span className="arq-strip-t">
            <b>Incubados</b> voltam sozinhos: “{incubados[0].texto.slice(0, 42)}
            {incubados[0].texto.length > 42 ? "…" : ""}” reaparece no seu Despacho em {mesDe(incubados[0].incubada_ate)}.
          </span>
          <button onClick={() => setFiltro("incubados")}>ver os {incubados.length} ›</button>
        </div>
      )}
    </div>
  );
}
