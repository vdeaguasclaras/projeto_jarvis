import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Fonte da leitura das notas (pedido do Raul: clean, boa leitura, leve).
// O next/font baixa no build e serve do nosso domínio — nada externo em runtime.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "#f6f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#141817" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
