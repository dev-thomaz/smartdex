/**
 * SmartDex domain model. UI code depends on these types only — never on raw
 * PokéAPI JSON. Adapters in `src/lib/api/pokeapi` translate external data.
 */

export const TYPE_NAMES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type TypeName = (typeof TYPE_NAMES)[number];

export function isTypeName(value: string): value is TypeName {
  return (TYPE_NAMES as readonly string[]).includes(value);
}

/** How a species relates to a game's Pokédexes. Never mixed. */
export type Availability =
  /** Listed in the base-game regional Pokédex. */
  | "regional"
  /** Listed only in a DLC Pokédex. */
  | "dlc"
  /** Listed only in the in-game National Pokédex. */
  | "national"
  /**
   * Compatible with the game (has a learnset) but absent from every regional
   * Pokédex: obtained via transfer, events or other special methods.
   */
  | "outside-dex";

export interface CatalogForm {
  /** PokéAPI `pokemon` id. */
  id: number;
  slug: string;
  label: string;
  types: TypeName[];
}

export interface CatalogEntry {
  /** National Pokédex number (PokéAPI species id). */
  id: number;
  slug: string;
  name: string;
  /** Types of the display form. */
  types: TypeName[];
  /** PokéAPI pokemon id used for artwork. */
  artId: number;
  /** Regional number per pokedex id (e.g. `{ galar: 1 }`). */
  dex: Record<string, number>;
  availability: Availability;
  /** False when PokéAPI has no learnset for this species in the game. */
  hasLearnset: boolean;
  /**
   * Game id (version) where this species is exclusive, among the versions of
   * the same version group. Absent when shared or when exclusives are unknown.
   */
  exclusiveTo?: string;
  /** Forms (PokéAPI varieties) with a learnset in this game (default form if none). */
  forms: CatalogForm[];
  legendary: boolean;
  mythical: boolean;
}

/** Validated composition of one dex: its size is the progress denominator. */
export interface PokedexSummary {
  id: string;
  /** Number of distinct species in the dex. */
  size: number;
}

export interface GameCatalog {
  schemaVersion: number;
  versionGroup: string;
  generatedAt: string;
  source: string;
  dexes: PokedexSummary[];
  /** True when some compatible species belong to no dex (shows the "all compatible" view). */
  hasOutsideDex: boolean;
  exclusives: ExclusivesStatus;
  entries: CatalogEntry[];
}

/**
 * Whether version exclusives could be derived for this version group.
 * - `available`: computed from per-version encounters.
 * - `single-version`: only one game uses this data (no exclusives exist).
 * - `no-encounter-data`: PokéAPI lacks reliable encounters, so exclusives are unknown.
 */
export type ExclusivesStatus = "available" | "single-version" | "no-encounter-data";

export type CoverageLevel = "complete" | "partial" | "missing";

/** What PokéAPI actually provides for a game, measured by the data generator. */
export interface GameDataCoverage {
  pokedex: CoverageLevel;
  learnsets: CoverageLevel;
  machines: CoverageLevel | "not-applicable";
  /** `inherited`: no evolution records of its own; methods come from earlier games. */
  evolutions: "recorded" | "inherited";
  encounters: CoverageLevel;
  flavorText: CoverageLevel;
}

export interface CoverageMetrics {
  dexSpecies: number;
  speciesWithLearnset: number;
  machineMoves: number;
  machineMovesWithoutLabel: number;
  evolutionRecords: number;
  speciesWithEncounters: number;
  flavorTexts: number;
}

export interface LibraryGame {
  coverPokemonId: number | null;
  coverage: GameDataCoverage;
  metrics: CoverageMetrics;
}

/** Everything the game library needs, without loading every catalog. */
export interface LibraryFile {
  schemaVersion: number;
  generatedAt: string;
  versionGroups: Record<string, { dexes: PokedexSummary[]; defaultDexSpecies: number[] }>;
  games: Record<string, LibraryGame>;
}

export type MoveCategory = "physical" | "special" | "status";

export interface MoveInfo {
  id: number;
  slug: string;
  name: string;
  type: TypeName;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveIndex {
  schemaVersion: number;
  versionGroup: string;
  generatedAt: string;
  moves: Record<string, MoveInfo>;
  /** move id → machine label, e.g. `{ "53": "TR02" }`. */
  machines: Record<string, string>;
}

export type TypeChart = Record<TypeName, Partial<Record<TypeName, number>>>;

export interface TypeChartFile {
  schemaVersion: number;
  generatedAt: string;
  /** generation → attacking type → defending type → multiplier (only ≠ 1). */
  byGeneration: Record<string, { types: TypeName[]; chart: TypeChart }>;
}

export type LearnMethod = "level-up" | "machine" | "egg" | "tutor" | "other";

export interface LearnedMove {
  move: MoveInfo;
  method: LearnMethod;
  /** Level for level-up moves (0 = learned on evolution). */
  level: number | null;
  /** Machine label for machine moves (e.g. "TM08", "TR02"). */
  machine: string | null;
  /** Machine kind prefix label (e.g. "TM" or "TR"). */
  machineKind: string | null;
  /** Raw learn method slug for "other" moves. */
  rawMethod: string;
}

export type StatKey = "hp" | "attack" | "defense" | "special-attack" | "special-defense" | "speed";

export interface StatValue {
  key: StatKey;
  value: number;
}

export interface AbilityInfo {
  slug: string;
  name: string;
  hidden: boolean;
  description: string | null;
}

export interface EvolutionCondition {
  /** Human readable, already localized. */
  text: string;
}

export interface EvolutionMethod {
  conditions: EvolutionCondition[];
  /**
   * Set when PokéAPI has no record for this game and the method comes from
   * the most recent earlier version group (PokéAPI only records changes).
   */
  recordedIn: string | null;
}

export interface VersionGroupFile {
  schemaVersion: number;
  generatedAt: string;
  versionGroups: { name: string; order: number; generation: number }[];
}

export interface EvolutionNode {
  speciesId: number;
  slug: string;
  name: string;
  /** Present in this game (has a learnset). */
  inGame: boolean;
  /** Ways to evolve INTO this node from its parent. Empty for the root. */
  methods: EvolutionMethod[];
  children: EvolutionNode[];
}

export interface EncounterInfo {
  locationSlug: string;
  location: string;
  method: string;
  minLevel: number;
  maxLevel: number;
  /** Highest chance (percentage) reported for this location/method. */
  chance: number | null;
  conditions: string[];
  /** Which PokéAPI version reported it (base game or DLC). */
  version: string;
}

export interface PokemonDetail {
  speciesId: number;
  pokemonId: number;
  slug: string;
  speciesSlug: string;
  name: string;
  formLabel: string | null;
  genus: string | null;
  flavorText: string | null;
  types: TypeName[];
  heightDm: number;
  weightHg: number;
  abilities: AbilityInfo[];
  stats: StatValue[];
  moves: LearnedMove[];
  evolution: EvolutionNode | null;
  encounters: EncounterInfo[];
  /** Other games of the same version group where PokéAPI lists encounters. */
  encountersInSiblingGames: string[];
  artworkUrl: string;
}
