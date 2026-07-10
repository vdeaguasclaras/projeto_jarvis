"use client";

import { useEffect, useState } from "react";
import { DAY_EVENTS } from "@/lib/demo";

const H0 = 8;
const H1 = 19;
const ROW = 52;

function hh(t: number) {
  return `${Math.floor(t)}:${String(Math.round((t % 1) * 60)).padStart(2, "0")}`;
}

type Props = {
  inboxCount: number;
  placar: { done: number; total: number };
  seq: number;
  onCheck: () => void;
  onToast: (msg: string) => void;
};

export default function DayView({ inboxCount, placar, seq, onCheck, onToast }: Props) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow(d.getHours() + d.getMinutes() / 60);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const pct = Math.min(100, Math.round((placar.done / Math.max(placar.total, 1)) * 100));

  return (
    <div className="view-in">
      <div className="daycheck stagger" style={{ ["--i" as string]: 0 }}>
        <div style={{ flex: 1 }}>
          <div className="ttl">◉ Check do dia</div>
          <div className="sub">
            {inboxCount > 0 ? (
              <>
                Sua Inbox tem <b>{inboxCount}</b> {inboxCount === 1 ? "item esperando" : "itens esperando"} triagem —
                etapa <b>Organizar</b> do CODE.
              </>
            ) : (
              <>Inbox zero — capture à vontade, a triagem organiza depois.</>
            )}
          </div>
          <div className="game-row">
            <div className="gamebar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <span className="game-lbl">
              Placar de hoje: <b>{placar.done} de {placar.total}</b>
              {" · 🔥 "}
              {seq > 1 ? (
                <>
                  <b>{seq} dias</b> de check em sequência
                </>
              ) : seq === 1 ? (
                <b>check de hoje feito</b>
              ) : (
                <>a sequência começa hoje</>
              )}
            </span>
          </div>
        </div>
        <button className="go" onClick={onCheck}>
          Fazer o check
        </button>
      </div>

      <div className="timegrid stagger" style={{ ["--i" as string]: 1 }}>
        {hours.map((h, i) => (
          <div key={h} className="hourlabel" style={{ gridRow: i + 1 }}>
            {h}:00
          </div>
        ))}
        <div className="daycol" style={{ gridRow: `1 / span ${H1 - H0}`, gridColumn: 2 }}>
          {hours.map((h) => (
            <div key={h} className="hourline" />
          ))}
          {DAY_EVENTS.map((ev) => (
            <div
              key={ev.id}
              className={`evt ${ev.source}`}
              style={{ top: (ev.start - H0) * ROW, height: (ev.end - ev.start) * ROW - 3 }}
              role="button"
              tabIndex={0}
              onClick={() => onToast(`${ev.title} · ${ev.container} — agenda de exemplo; eventos reais chegam no Marco 5`)}
            >
              <span className="t">{ev.title}</span>
              <span className="h">
                {hh(ev.start)} – {hh(ev.end)}
              </span>
            </div>
          ))}
          {now !== null && now >= H0 && now <= H1 && (
            <div className="nowline" style={{ top: (now - H0) * ROW }} />
          )}
        </div>
      </div>
    </div>
  );
}
