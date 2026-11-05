"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { GameId } from "@/features/games/config";
import type {
  CatalogEntry,
  ExclusivesStatus,
  GameDataCoverage,
  PokedexSummary,
} from "@/types/domain";

/** Slim catalog entry shipped to the client (no form list). */
export type CardEntry = Omit<CatalogEntry, "forms">;

export interface CatalogContextValue {
  game: GameId;
  entries: CardEntry[];
  dexes: PokedexSummary[];
  /** Whether the "all compatible" view adds species beyond the listed dexes. */
  hasOutsideDex: boolean;
  exclusives: ExclusivesStatus;
  coverage: GameDataCoverage | null;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

/** Provided once per game layout so pages and global search share one copy. */
export function CatalogProvider({
  children,
  ...value
}: CatalogContextValue & { children: ReactNode }) {
  return <CatalogContext value={value}>{children}</CatalogContext>;
}

export function useCatalog(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog must be used inside CatalogProvider");
  return value;
}
