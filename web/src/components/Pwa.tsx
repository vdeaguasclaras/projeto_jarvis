"use client";

import { useEffect, useState } from "react";
import { hojeISO } from "@/lib/db";

/** Marco 7 — PWA: registra o service worker e dispara a notificação do
 *  Despacho (uma por dia, quando o app abre com Inbox pendente).
 *  Notificação com o app fechado exige push com servidor — fica para depois. */

type Props = { logged: boolean; inboxCount: number };

export default function Pwa({ logged, inboxCount }: Props) {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (!logged || inboxCount === 0) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const hoje = hojeISO();
    if (localStorage.getItem("kairos-notif-check") === hoje) return;
    navigator.serviceWorker.ready
      .then((reg) =>
        reg.showNotification("◉ Despacho", {
          body: `Sua Inbox tem ${inboxCount} ${inboxCount === 1 ? "item esperando" : "itens esperando"} triagem.`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "kairos-check-dia",
        }),
      )
      .then(() => localStorage.setItem("kairos-notif-check", hoje))
      .catch(() => {});
  }, [logged, inboxCount]);

  return null;
}

/** Botão da sidebar para ativar o lembrete (a permissão exige gesto do usuário). */
export function LembreteCheck() {
  const [estado, setEstado] = useState<NotificationPermission | "sem" | null>(null);

  useEffect(() => {
    setEstado(typeof Notification === "undefined" ? "sem" : Notification.permission);
  }, []);

  if (estado === null || estado === "sem" || estado === "denied") return null;
  if (estado === "granted")
    return (
      <button className="theme-toggle" disabled style={{ opacity: 0.7, cursor: "default" }}>
        🔔 Lembrete do check ativo
      </button>
    );
  return (
    <button className="theme-toggle" onClick={() => Notification.requestPermission().then(setEstado)}>
      🔔 Ativar lembrete do check
    </button>
  );
}
