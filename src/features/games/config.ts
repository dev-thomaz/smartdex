/**
 * Central, game-specific configuration.
 *
 * Every game-dependent decision in the app (which Pokédex to list, which
 * learnset version group to read, which encounter versions to show, which
 * type-chart generation applies...) must come from here. Components never
 * branch on a game id directly.
 *
 * This file is plain data with no runtime dependencies so the data
 * generation script (`scripts/generate-data.ts`) can import it too.
 */

export type GameId = "sword" | "shield";
export type VersionGroupId = "sword-shield";

export type PokedexKind = "base" | "dlc";

export interface PokedexSection {
  /** PokéAPI `pokedex` resource name. */
  id: string;
  label: string;
  shortLabel: string;
  kind: PokedexKind;
  /** Expansion name for DLC dexes. */
  expansion?: string;
}

export interface MachineKindConfig {
  /** Prefix of the PokéAPI item name, e.g. `tm` → `tm08`. */
  itemPrefix: string;
  label: string;
}

export interface VersionGroupConfig {
  id: VersionGroupId;
  generation: number;
  region: string;
  regionLabel: string;
  /** Regional dexes in display order. The first `base` entry is the default. */
  pokedexes: PokedexSection[];
  /**
   * PokéAPI version groups whose learnsets belong to this game. DLC version
   * groups exist in PokéAPI; moves are currently stored under the base group,
   * but listing them keeps the adapter correct if that changes.
   */
  learnsetVersionGroups: string[];
  /** Machine kinds available in this generation (TM, TR, HM...). */
  machineKinds: MachineKindConfig[];
  /**
   * Regional-variant form tag preferred for card art/types when the species
   * has such a form available in this game (e.g. Galarian Meowth).
   */
  preferredFormTag?: string;
}

export interface GameConfig {
  id: GameId;
  name: string;
  shortName: string;
  versionGroup: VersionGroupId;
  /** PokéAPI `version` resource name (used for Pokédex flavor text). */
  pokeapiVersion: string;
  /** PokéAPI versions whose encounters belong to this game (base + DLC). */
  encounterVersions: string[];
  /** Accent color (CSS color) used sparingly for game identity. */
  accent: string;
  /** Text label for the game family in selectors. */
  family: string;
}

export const VERSION_GROUPS: Record<VersionGroupId, VersionGroupConfig> = {
  "sword-shield": {
    id: "sword-shield",
    generation: 8,
    region: "galar",
    regionLabel: "Galar",
    pokedexes: [
      { id: "galar", label: "Pokédex de Galar", shortLabel: "Galar", kind: "base" },
      {
        id: "isle-of-armor",
        label: "Pokédex da Isle of Armor",
        shortLabel: "Isle of Armor",
        kind: "dlc",
        expansion: "The Isle of Armor",
      },
      {
        id: "crown-tundra",
        label: "Pokédex da Crown Tundra",
        shortLabel: "Crown Tundra",
        kind: "dlc",
        expansion: "The Crown Tundra",
      },
    ],
    learnsetVersionGroups: ["sword-shield", "the-isle-of-armor", "the-crown-tundra"],
    machineKinds: [
      { itemPrefix: "tm", label: "TM" },
      { itemPrefix: "tr", label: "TR" },
    ],
    preferredFormTag: "galar",
  },
};

export const GAMES: Record<GameId, GameConfig> = {
  sword: {
    id: "sword",
    name: "Pokémon Sword",
    shortName: "Sword",
    versionGroup: "sword-shield",
    pokeapiVersion: "sword",
    encounterVersions: ["sword", "the-isle-of-armor-sword", "the-crown-tundra-sword"],
    accent: "oklch(0.62 0.14 245)",
    family: "Geração VIII · Galar",
  },
  shield: {
    id: "shield",
    name: "Pokémon Shield",
    shortName: "Shield",
    versionGroup: "sword-shield",
    pokeapiVersion: "shield",
    encounterVersions: ["shield", "the-isle-of-armor-shield", "the-crown-tundra-shield"],
    accent: "oklch(0.6 0.17 15)",
    family: "Geração VIII · Galar",
  },
};

/** Games listed in the selector as "coming soon" — not selectable yet. */
export const PLANNED_GAMES: { name: string; family: string }[] = [
  { name: "Scarlet / Violet", family: "Geração IX · Paldea" },
  { name: "Brilliant Diamond / Shining Pearl", family: "Geração VIII · Sinnoh" },
  { name: "Diamond / Pearl", family: "Geração IV · Sinnoh" },
  { name: "FireRed / LeafGreen", family: "Geração III · Kanto" },
];

export const GAME_IDS = Object.keys(GAMES) as GameId[];
export const DEFAULT_GAME: GameId = "sword";

export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && value in GAMES;
}

export function getGame(id: GameId): GameConfig {
  return GAMES[id];
}

export function getVersionGroup(id: VersionGroupId): VersionGroupConfig {
  return VERSION_GROUPS[id];
}

export function getGameVersionGroup(id: GameId): VersionGroupConfig {
  return VERSION_GROUPS[GAMES[id].versionGroup];
}

/** Games grouped by family label, preserving declaration order. */
export function getGamesByFamily(): { family: string; games: GameConfig[] }[] {
  const groups = new Map<string, GameConfig[]>();
  for (const game of Object.values(GAMES)) {
    const list = groups.get(game.family) ?? [];
    list.push(game);
    groups.set(game.family, list);
  }
  return [...groups.entries()].map(([family, games]) => ({ family, games }));
}
