"use client";

/** Escolha de ícone de projeto/área/recurso: opções prontas + campo livre —
 *  cole qualquer emoji do computador ou de outro site (pedido do Raul). */

const ICONES = ["🎯", "📊", "🏗️", "💰", "🏠", "👥", "🤝", "⚖️", "📚", "🧠", "💡", "🗂️", "🌱", "🛠️", "✈️", "❤️"];

type Props = {
  valor: string | null; // ícone atual ("" ou null = sem)
  onChange: (icone: string | null) => void;
};

export default function IconePicker({ valor, onChange }: Props) {
  const atual = valor?.trim() || null;
  const customizado = atual !== null && !ICONES.includes(atual);
  return (
    <>
      <div className="pillrow" style={{ marginBottom: 6 }}>
        <button className={`pill-opt${atual === null ? " on" : ""}`} onClick={() => onChange(null)}>
          sem
        </button>
        {ICONES.map((e) => (
          <button
            key={e}
            className={`pill-opt${atual === e ? " on" : ""}`}
            style={{ padding: "3px 8px" }}
            onClick={() => onChange(e)}
          >
            {e}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          className={`tri-input icone-livre${customizado ? " on" : ""}`}
          value={customizado ? atual : ""}
          onChange={(e) => onChange(e.target.value.trim() || null)}
          placeholder="✚ outro"
          title="Cole aqui qualquer emoji — do seu computador ou de outro site"
          maxLength={16}
        />
        <span className="empty-hint" style={{ margin: 0 }}>ou cole aqui qualquer emoji</span>
      </div>
    </>
  );
}
