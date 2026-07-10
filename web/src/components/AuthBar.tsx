"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = { onToast: (msg: string) => void };

export default function AuthBar({ onToast }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sb = supabase;
  if (!sb) {
    return (
      <div className="authbar">
        <span className="chip muted">modo demonstração — banco não configurado</span>
      </div>
    );
  }

  const send = async () => {
    const addr = email.trim();
    if (!addr || sending) return;
    setSending(true);
    const { error } = await sb.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      onToast(`Não foi possível enviar o link: ${error.message}`);
    } else {
      setSent(true);
      onToast(`Link mágico enviado para ${addr} — abra o e-mail para entrar`);
    }
  };

  return (
    <div className="authbar">
      <div>
        <b>Entre para salvar de verdade</b>
        <span>
          {sent
            ? "Link enviado! Abra seu e-mail e clique para entrar."
            : "Sem login, as capturas ficam só nesta aba. Login Google/Microsoft chega no Marco 2."}
        </span>
      </div>
      {!sent && (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="seu@email.com"
            autoComplete="email"
          />
          <button onClick={send} disabled={sending}>
            {sending ? "Enviando…" : "Entrar por link mágico"}
          </button>
        </>
      )}
    </div>
  );
}
