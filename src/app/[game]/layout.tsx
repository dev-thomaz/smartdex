import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AppShellFallback } from "@/components/layout/app-shell-fallback";
import { GameTracker } from "@/components/layout/game-tracker";
import { GAME_IDS, getGame, isGameId } from "@/features/games/config";
import { getCardEntries } from "@/features/pokedex/catalog";
import { CatalogProvider } from "@/features/pokedex/catalog-context";

export function generateStaticParams() {
  return GAME_IDS.map((game) => ({ game }));
}

export default function GameLayout({ children, params }: LayoutProps<"/[game]">) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <GameScope params={params}>{children}</GameScope>
    </Suspense>
  );
}

async function GameScope({
  params,
  children,
}: {
  params: Promise<{ game: string }>;
  children: ReactNode;
}) {
  const { game } = await params;
  if (!isGameId(game)) notFound();
  return (
    <CatalogProvider game={game} entries={getCardEntries(getGame(game).versionGroup)}>
      <GameTracker game={game} />
      <AppShell game={game}>{children}</AppShell>
    </CatalogProvider>
  );
}
