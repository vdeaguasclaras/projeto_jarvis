import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

// Fontes baixadas no build e servidas do nosso domínio — nada externo em runtime.
// Inter: leitura das notas. Lora: display/editorial do redesign 2026-07
// (saudação, manchetes da Revisão, citações).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Kairós — o tempo certo",
  description:
    "Planner pessoal centrado no calendário: PARA, GTD, CODE e Zettelkasten em um só lugar.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#171a17" },
  ],
};

// Reaplica o tema escolhido ANTES da primeira pintura (sem flash).
// "sistema" = sem data-theme; o CSS segue prefers-color-scheme.
const temaInicial = `(function(){try{var t=localStorage.getItem("kairos.tema");if(t==="claro")document.documentElement.dataset.theme="light";else if(t==="escuro")document.documentElement.dataset.theme="dark";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${lora.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
        {children}
      </body>
    </html>
  );
}
