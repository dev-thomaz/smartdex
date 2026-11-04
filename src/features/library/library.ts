/**
 * Game library data: per-game default-dex composition and measured PokéAPI
 * coverage. Small enough to ship to the client (no full catalogs).
 */

import libraryFile from "@/data/generated/library.json";
import { GAMES, getDefaultPokedex, type GameId } from "@/features/games/config";
import type { GameDataCoverage, LibraryFile, LibraryGame } from "@/types/domain";

const library = libraryFile as LibraryFile;

export function getLibraryGame(game: GameId): LibraryGame | null {
  return library.games[game] ?? null;
}

/** Species ids of the game's default dex (progress denominator on the card). */
export function getDefaultDexSpecies(game: GameId): number[] {
  return library.versionGroups[GAMES[game].versionGroup]?.defaultDexSpecies ?? [];
}

export interface LibraryCardData {
  id: GameId;
  defaultDexLabel: string;
  defaultDexSpecies: number[];
  coverPokemonId: number | null;
  coverage: GameDataCoverage | null;
}

export function getLibraryCards(): LibraryCardData[] {
  return (Object.keys(GAMES) as GameId[]).map((id) => ({
    id,
    defaultDexLabel: getDefaultPokedex(id).label,
    defaultDexSpecies: getDefaultDexSpecies(id),
    coverPokemonId: library.games[id]?.coverPokemonId ?? null,
    coverage: library.games[id]?.coverage ?? null,
  }));
}
