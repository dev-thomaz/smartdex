import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

/**
 * Atkinson Hyperlegible was designed by the Braille Institute for low vision
 * readers; its distinct letterforms (b/d, I/l/1) also help with dyslexia.
 * (The "Next" variant has no fallback metrics in next/font yet → layout shift.)
 */
const sans = Atkinson_Hyperlegible({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SmartDex", template: "%s · SmartDex" },
  description:
    "Pokédex multijogo: movimentos, evoluções, tipos e locais do jogo que você está jogando, com controle de capturas.",
  applicationName: "SmartDex",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#16171c" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${sans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
