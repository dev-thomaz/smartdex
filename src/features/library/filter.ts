import { normalizeSearch } from "@/features/pokedex/filters";
import {
  GAMES,
  getGamesByGeneration,
  type GameConfig,
  type GenerationGroup,
} from "@/features/games/config";

export interface LibraryFilter {
  query: string;
  /** `null` = every generation. */
  generation: number | null;
}

export function matchesGameQuery(game: GameConfig, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  return [game.name, game.shortName, game.id].some((text) => normalizeSearch(text).includes(q));
}

/** Library sections (oldest generation first) after search and generation filter. */
export function filterLibrary(
  filter: LibraryFilter,
  games: readonly GameConfig[] = Object.values(GAMES),
): GenerationGroup[] {
  return getGamesByGeneration(games)
    .filter((group) => filter.generation === null || group.generation === filter.generation)
    .map((group) => ({
      ...group,
      games: group.games.filter((g) => matchesGameQuery(g, filter.query)),
    }))
    .filter((group) => group.games.length > 0);
}
