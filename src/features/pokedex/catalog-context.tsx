"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { GameId } from "@/features/games/config";
import type { CatalogEntry } from "@/types/domain";

/** Slim catalog entry shipped to the client (no form list). */
export type CardEntry = Omit<CatalogEntry, "forms">;

interface CatalogContextValue {
  game: GameId;
  entries: CardEntry[];
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

/** Provided once per game layout so pages and global search share one copy. */
export function CatalogProvider({
  game,
  entries,
  children,
}: CatalogContextValue & { children: ReactNode }) {
  return <CatalogContext value={{ game, entries }}>{children}</CatalogContext>;
}

export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog must be used inside CatalogProvider");
  return value;
}
