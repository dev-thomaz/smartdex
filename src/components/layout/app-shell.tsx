import type { ReactNode } from "react";

import type { GameId } from "@/features/games/config";

import { BottomNav, MobileHeader } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export function AppShell({ game, children }: { game: GameId; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Sidebar game={game} />
      <MobileHeader game={game} />
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-10 lg:pt-8 lg:pb-12"
      >
        {children}
      </main>
      <BottomNav game={game} />
    </div>
  );
}
