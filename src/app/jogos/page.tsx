import type { Metadata } from "next";

import { GameLibrary } from "@/features/library/components/game-library";
import { getLibraryCards } from "@/features/library/library";

export const metadata: Metadata = { title: "Jogos" };

export default function GamesPage() {
  return <GameLibrary cards={getLibraryCards()} />;
}
