/**
 * Central, game-specific configuration for every supported mainline game.
 *
 * Every game-dependent decision (which Pokédexes exist, which learnset
 * version groups to read, which encounter versions belong to the game, which
 * generation's mechanics apply...) comes from here. Components never branch on
 * a game id.
 *
 * Plain data with no runtime dependencies so `scripts/generate-data.ts` can
 * import it too. Data coverage per game is measured by that script and stored
 * in `src/data/generated/library.json`, not declared here.
 */

/* ------------------------------------------------------------------ model */

export type PokedexKind =
  /** Main regional dex of the base game. */
  | "base"
  /** Dex added by an expansion/DLC. */
  | "dlc"
  /** Sub-area of a region (Kalos sections, Alolan islands). */
  | "area"
  /** In-game National Pokédex (all species up to the game's generation). */
  | "national";

export interface GamePokedex {
  /** Stable SmartDex id (equals the PokéAPI pokedex name when single-sourced). */
  id: string;
  label: string;
  shortLabel: string;
  kind: PokedexKind;
  /**
   * PokéAPI `pokedex` names merged into this dex, or `"national"` for every
   * species introduced up to the game's generation.
   */
  sources: string[] | "national";
  /** `regional` uses PokéAPI entry numbers; `national` shows national numbers. */
  numbering: "regional" | "national";
  /** Expansion name for DLC dexes. */
  expansion?: string;
}

export interface VersionGroupConfig {
  /** PokéAPI version group name. */
  id: string;
  generation: number;
  region: string;
  regionLabel: string;
  /** Dexes in display order. The first one is the game's default dex. */
  pokedexes: GamePokedex[];
  /** PokéAPI version groups whose learnsets and machines belong to this game. */
  learnsetVersionGroups: string[];
  /**
   * Last generation included in the in-game National Pokédex, when it differs
   * from the game's generation (BDSP is Gen VIII but its National Dex stops at 493).
   */
  nationalDexGeneration?: number;
  /**
   * Regional-variant form tag preferred for card art/types when the species
   * has such a form available in this game (e.g. Galarian Meowth).
   */
  preferredFormTag?: string;
}

export interface GameConfig {
  /** PokéAPI `version` name; also the URL segment and the collection key. */
  id: string;
  name: string;
  shortName: string;
  versionGroup: string;
  /** PokéAPI `version` used for Pokédex flavor text. */
  pokeapiVersion: string;
  /** PokéAPI versions whose encounters belong to the game (base + DLC). */
  encounterVersions: string[];
  /** Accent color used for the game's card and identity dot. */
  accent: string;
  /** Pokémon (PokéAPI `pokemon` name) used on the illustrated cover. */
  coverPokemon: string;
  releaseYear: number;
}

/** Mechanics that change between generations, derived from the generation. */
export interface GenerationMechanics {
  abilities: boolean;
  hiddenAbilities: boolean;
  /** Gen I had a single "Special" stat. */
  splitSpecialStat: boolean;
}

export function mechanicsFor(generation: number): GenerationMechanics {
  return {
    abilities: generation >= 3,
    hiddenAbilities: generation >= 5,
    splitSpecialStat: generation >= 2,
  };
}

export const GENERATIONS: Record<number, { label: string; years: string }> = {
  1: { label: "Geração I", years: "1996–1998" },
  2: { label: "Geração II", years: "1999–2000" },
  3: { label: "Geração III", years: "2002–2004" },
  4: { label: "Geração IV", years: "2006–2009" },
  5: { label: "Geração V", years: "2010–2012" },
  6: { label: "Geração VI", years: "2013–2014" },
  7: { label: "Geração VII", years: "2016–2018" },
  8: { label: "Geração VIII", years: "2019–2022" },
  9: { label: "Geração IX", years: "2022–2025" },
};

/* -------------------------------------------------------- dex helpers */

function regional(
  id: string,
  label: string,
  shortLabel: string,
  kind: PokedexKind = "base",
  expansion?: string,
): GamePokedex {
  return { id, label, shortLabel, kind, sources: [id], numbering: "regional", expansion };
}

const NATIONAL: GamePokedex = {
  id: "national",
  label: "Pokédex Nacional",
  shortLabel: "Nacional",
  kind: "national",
  sources: "national",
  numbering: "national",
};

const KANTO = regional("kanto", "Pokédex de Kanto", "Kanto");

/* ------------------------------------------------------ version groups */

export const VERSION_GROUPS = {
  "red-green-japan": {
    id: "red-green-japan",
    generation: 1,
    region: "kanto",
    regionLabel: "Kanto",
    pokedexes: [KANTO],
    learnsetVersionGroups: ["red-green-japan"],
  },
  "blue-japan": {
    id: "blue-japan",
    generation: 1,
    region: "kanto",
    regionLabel: "Kanto",
    pokedexes: [KANTO],
    learnsetVersionGroups: ["blue-japan"],
  },
  "red-blue": {
    id: "red-blue",
    generation: 1,
    region: "kanto",
    regionLabel: "Kanto",
    pokedexes: [KANTO],
    learnsetVersionGroups: ["red-blue"],
  },
  yellow: {
    id: "yellow",
    generation: 1,
    region: "kanto",
    regionLabel: "Kanto",
    pokedexes: [KANTO],
    learnsetVersionGroups: ["yellow"],
  },
  "gold-silver": {
    id: "gold-silver",
    generation: 2,
    region: "johto",
    regionLabel: "Johto",
    pokedexes: [regional("original-johto", "Pokédex de Johto", "Johto"), NATIONAL],
    learnsetVersionGroups: ["gold-silver"],
  },
  crystal: {
    id: "crystal",
    generation: 2,
    region: "johto",
    regionLabel: "Johto",
    pokedexes: [regional("original-johto", "Pokédex de Johto", "Johto"), NATIONAL],
    learnsetVersionGroups: ["crystal"],
  },
  "ruby-sapphire": {
    id: "ruby-sapphire",
    generation: 3,
    region: "hoenn",
    regionLabel: "Hoenn",
    pokedexes: [regional("hoenn", "Pokédex de Hoenn", "Hoenn"), NATIONAL],
    learnsetVersionGroups: ["ruby-sapphire"],
  },
  emerald: {
    id: "emerald",
    generation: 3,
    region: "hoenn",
    regionLabel: "Hoenn",
    pokedexes: [regional("hoenn", "Pokédex de Hoenn", "Hoenn"), NATIONAL],
    learnsetVersionGroups: ["emerald"],
  },
  "firered-leafgreen": {
    id: "firered-leafgreen",
    generation: 3,
    region: "kanto",
    regionLabel: "Kanto",
    pokedexes: [KANTO, NATIONAL],
    learnsetVersionGroups: ["firered-leafgreen"],
  },
  "diamond-pearl": {
    id: "diamond-pearl",
    generation: 4,
    region: "sinnoh",
    regionLabel: "Sinnoh",
    pokedexes: [regional("original-sinnoh", "Pokédex de Sinnoh", "Sinnoh"), NATIONAL],
    learnsetVersionGroups: ["diamond-pearl"],
  },
  platinum: {
    id: "platinum",
    generation: 4,
    region: "sinnoh",
    regionLabel: "Sinnoh",
    pokedexes: [regional("extended-sinnoh", "Pokédex de Sinnoh", "Sinnoh"), NATIONAL],
    learnsetVersionGroups: ["platinum"],
  },
  "heartgold-soulsilver": {
    id: "heartgold-soulsilver",
    generation: 4,
    region: "johto",
    regionLabel: "Johto",
    pokedexes: [regional("updated-johto", "Pokédex de Johto", "Johto"), NATIONAL],
    learnsetVersionGroups: ["heartgold-soulsilver"],
  },
  "black-white": {
    id: "black-white",
    generation: 5,
    region: "unova",
    regionLabel: "Unova",
    pokedexes: [regional("original-unova", "Pokédex de Unova", "Unova"), NATIONAL],
    learnsetVersionGroups: ["black-white"],
  },
  "black-2-white-2": {
    id: "black-2-white-2",
    generation: 5,
    region: "unova",
    regionLabel: "Unova",
    pokedexes: [regional("updated-unova", "Pokédex de Unova", "Unova"), NATIONAL],
    learnsetVersionGroups: ["black-2-white-2"],
  },
  "x-y": {
    id: "x-y",
    generation: 6,
    region: "kalos",
    regionLabel: "Kalos",
    pokedexes: [
      {
        id: "kalos",
        label: "Pokédex de Kalos",
        shortLabel: "Kalos",
        kind: "base",
        sources: ["kalos-central", "kalos-coastal", "kalos-mountain"],
        numbering: "national",
      },
      regional("kalos-central", "Kalos Central", "Central", "area"),
      regional("kalos-coastal", "Kalos Costeira", "Costeira", "area"),
      regional("kalos-mountain", "Kalos Montanhosa", "Montanhosa", "area"),
      NATIONAL,
    ],
    learnsetVersionGroups: ["x-y"],
  },
  "omega-ruby-alpha-sapphire": {
    id: "omega-ruby-alpha-sapphire",
    generation: 6,
    region: "hoenn",
    regionLabel: "Hoenn",
    pokedexes: [regional("updated-hoenn", "Pokédex de Hoenn", "Hoenn"), NATIONAL],
    learnsetVersionGroups: ["omega-ruby-alpha-sapphire"],
  },
  "sun-moon": {
    id: "sun-moon",
    generation: 7,
    region: "alola",
    regionLabel: "Alola",
    pokedexes: [
      regional("original-alola", "Pokédex de Alola", "Alola"),
      regional("original-melemele", "Melemele", "Melemele", "area"),
      regional("original-akala", "Akala", "Akala", "area"),
      regional("original-ulaula", "Ula'ula", "Ula'ula", "area"),
      regional("original-poni", "Poni", "Poni", "area"),
    ],
    learnsetVersionGroups: ["sun-moon"],
    preferredFormTag: "alola",
  },
  "ultra-sun-ultra-moon": {
    id: "ultra-sun-ultra-moon",
    generation: 7,
    region: "alola",
    regionLabel: "Alola",
    pokedexes: [
      regional("updated-alola", "Pokédex de Alola", "Alola"),
      regional("updated-melemele", "Melemele", "Melemele", "area"),
      regional("updated-akala", "Akala", "Akala", "area"),
      regional("updated-ulaula", "Ula'ula", "Ula'ula", "area"),
      regional("updated-poni", "Poni", "Poni", "area"),
    ],
    learnsetVersionGroups: ["ultra-sun-ultra-moon"],
    preferredFormTag: "alola",
  },
  "lets-go-pikachu-lets-go-eevee": {
    id: "lets-go-pikachu-lets-go-eevee",
    generation: 7,
    region: "kanto",
    regionLabel: "Kanto",
    pokedexes: [regional("letsgo-kanto", "Pokédex de Kanto", "Kanto")],
    learnsetVersionGroups: ["lets-go-pikachu-lets-go-eevee"],
    preferredFormTag: "alola",
  },
  "sword-shield": {
    id: "sword-shield",
    generation: 8,
    region: "galar",
    regionLabel: "Galar",
    pokedexes: [
      regional("galar", "Pokédex de Galar", "Galar"),
      regional(
        "isle-of-armor",
        "Pokédex da Isle of Armor",
        "Isle of Armor",
        "dlc",
        "The Isle of Armor",
      ),
      regional(
        "crown-tundra",
        "Pokédex da Crown Tundra",
        "Crown Tundra",
        "dlc",
        "The Crown Tundra",
      ),
    ],
    learnsetVersionGroups: ["sword-shield", "the-isle-of-armor", "the-crown-tundra"],
    preferredFormTag: "galar",
  },
  "brilliant-diamond-shining-pearl": {
    id: "brilliant-diamond-shining-pearl",
    generation: 8,
    region: "sinnoh",
    regionLabel: "Sinnoh",
    pokedexes: [regional("original-sinnoh", "Pokédex de Sinnoh", "Sinnoh"), NATIONAL],
    learnsetVersionGroups: ["brilliant-diamond-shining-pearl"],
    nationalDexGeneration: 4,
  },
  "legends-arceus": {
    id: "legends-arceus",
    generation: 8,
    region: "hisui",
    regionLabel: "Hisui",
    pokedexes: [regional("hisui", "Pokédex de Hisui", "Hisui")],
    learnsetVersionGroups: ["legends-arceus"],
    preferredFormTag: "hisui",
  },
  "scarlet-violet": {
    id: "scarlet-violet",
    generation: 9,
    region: "paldea",
    regionLabel: "Paldea",
    pokedexes: [
      regional("paldea", "Pokédex de Paldea", "Paldea"),
      regional("kitakami", "Pokédex de Kitakami", "Kitakami", "dlc", "The Teal Mask"),
      regional("blueberry", "Pokédex da Blueberry", "Blueberry", "dlc", "The Indigo Disk"),
    ],
    learnsetVersionGroups: ["scarlet-violet", "the-teal-mask", "the-indigo-disk"],
    preferredFormTag: "paldea",
  },
  "legends-za": {
    id: "legends-za",
    generation: 9,
    region: "kalos",
    regionLabel: "Lumiose",
    pokedexes: [
      regional("lumiose-city", "Pokédex de Lumiose", "Lumiose"),
      regional("hyperspace", "Pokédex do Hiperespaço", "Hiperespaço", "dlc", "Mega Dimension"),
    ],
    learnsetVersionGroups: ["legends-za", "mega-dimension"],
  },
} satisfies Record<string, VersionGroupConfig>;

export type VersionGroupId = keyof typeof VERSION_GROUPS;

/* --------------------------------------------------------------- games */

function game(
  id: string,
  name: string,
  shortName: string,
  versionGroup: VersionGroupId,
  accent: string,
  coverPokemon: string,
  releaseYear: number,
  dlcVersions: string[] = [],
): GameConfig {
  return {
    id,
    name,
    shortName,
    versionGroup,
    pokeapiVersion: id,
    encounterVersions: [id, ...dlcVersions],
    accent,
    coverPokemon,
    releaseYear,
  };
}

/** Declaration order = chronological order inside each generation. */
const GAME_LIST = [
  game(
    "red-japan",
    "Pokémon Red (Japão)",
    "Red JP",
    "red-green-japan",
    "oklch(0.58 0.2 28)",
    "charizard",
    1996,
  ),
  game(
    "green-japan",
    "Pokémon Green (Japão)",
    "Green JP",
    "red-green-japan",
    "oklch(0.58 0.15 150)",
    "venusaur",
    1996,
  ),
  game(
    "blue-japan",
    "Pokémon Blue (Japão)",
    "Blue JP",
    "blue-japan",
    "oklch(0.55 0.15 255)",
    "blastoise",
    1996,
  ),
  game("red", "Pokémon Red", "Red", "red-blue", "oklch(0.58 0.2 28)", "charizard", 1998),
  game("blue", "Pokémon Blue", "Blue", "red-blue", "oklch(0.55 0.15 255)", "blastoise", 1998),
  game("yellow", "Pokémon Yellow", "Yellow", "yellow", "oklch(0.8 0.15 90)", "pikachu", 1998),
  game("gold", "Pokémon Gold", "Gold", "gold-silver", "oklch(0.72 0.13 85)", "ho-oh", 1999),
  game("silver", "Pokémon Silver", "Silver", "gold-silver", "oklch(0.7 0.02 250)", "lugia", 1999),
  game("crystal", "Pokémon Crystal", "Crystal", "crystal", "oklch(0.7 0.1 220)", "suicune", 2000),
  game("ruby", "Pokémon Ruby", "Ruby", "ruby-sapphire", "oklch(0.55 0.2 20)", "groudon", 2002),
  game(
    "sapphire",
    "Pokémon Sapphire",
    "Sapphire",
    "ruby-sapphire",
    "oklch(0.5 0.16 260)",
    "kyogre",
    2002,
  ),
  game(
    "firered",
    "Pokémon FireRed",
    "FireRed",
    "firered-leafgreen",
    "oklch(0.62 0.2 40)",
    "charizard",
    2004,
  ),
  game(
    "leafgreen",
    "Pokémon LeafGreen",
    "LeafGreen",
    "firered-leafgreen",
    "oklch(0.65 0.15 140)",
    "venusaur",
    2004,
  ),
  game("emerald", "Pokémon Emerald", "Emerald", "emerald", "oklch(0.6 0.14 160)", "rayquaza", 2004),
  game(
    "diamond",
    "Pokémon Diamond",
    "Diamond",
    "diamond-pearl",
    "oklch(0.6 0.1 240)",
    "dialga",
    2006,
  ),
  game("pearl", "Pokémon Pearl", "Pearl", "diamond-pearl", "oklch(0.72 0.08 350)", "palkia", 2006),
  game(
    "platinum",
    "Pokémon Platinum",
    "Platinum",
    "platinum",
    "oklch(0.6 0.03 260)",
    "giratina-origin",
    2008,
  ),
  game(
    "heartgold",
    "Pokémon HeartGold",
    "HeartGold",
    "heartgold-soulsilver",
    "oklch(0.72 0.14 80)",
    "ho-oh",
    2009,
  ),
  game(
    "soulsilver",
    "Pokémon SoulSilver",
    "SoulSilver",
    "heartgold-soulsilver",
    "oklch(0.68 0.03 250)",
    "lugia",
    2009,
  ),
  game("black", "Pokémon Black", "Black", "black-white", "oklch(0.35 0.01 260)", "reshiram", 2010),
  game("white", "Pokémon White", "White", "black-white", "oklch(0.78 0.01 260)", "zekrom", 2010),
  game(
    "black-2",
    "Pokémon Black 2",
    "Black 2",
    "black-2-white-2",
    "oklch(0.35 0.03 240)",
    "kyurem-black",
    2012,
  ),
  game(
    "white-2",
    "Pokémon White 2",
    "White 2",
    "black-2-white-2",
    "oklch(0.75 0.04 20)",
    "kyurem-white",
    2012,
  ),
  game("x", "Pokémon X", "X", "x-y", "oklch(0.55 0.14 245)", "xerneas", 2013),
  game("y", "Pokémon Y", "Y", "x-y", "oklch(0.55 0.19 25)", "yveltal", 2013),
  game(
    "omega-ruby",
    "Pokémon Omega Ruby",
    "Omega Ruby",
    "omega-ruby-alpha-sapphire",
    "oklch(0.52 0.2 25)",
    "groudon-primal",
    2014,
  ),
  game(
    "alpha-sapphire",
    "Pokémon Alpha Sapphire",
    "Alpha Sapphire",
    "omega-ruby-alpha-sapphire",
    "oklch(0.52 0.16 250)",
    "kyogre-primal",
    2014,
  ),
  game("sun", "Pokémon Sun", "Sun", "sun-moon", "oklch(0.72 0.16 60)", "solgaleo", 2016),
  game("moon", "Pokémon Moon", "Moon", "sun-moon", "oklch(0.5 0.14 285)", "lunala", 2016),
  game(
    "ultra-sun",
    "Pokémon Ultra Sun",
    "Ultra Sun",
    "ultra-sun-ultra-moon",
    "oklch(0.66 0.18 45)",
    "necrozma-dusk",
    2017,
  ),
  game(
    "ultra-moon",
    "Pokémon Ultra Moon",
    "Ultra Moon",
    "ultra-sun-ultra-moon",
    "oklch(0.48 0.16 275)",
    "necrozma-dawn",
    2017,
  ),
  game(
    "lets-go-pikachu",
    "Pokémon Let's Go, Pikachu!",
    "Let's Go Pikachu",
    "lets-go-pikachu-lets-go-eevee",
    "oklch(0.8 0.15 90)",
    "pikachu",
    2018,
  ),
  game(
    "lets-go-eevee",
    "Pokémon Let's Go, Eevee!",
    "Let's Go Eevee",
    "lets-go-pikachu-lets-go-eevee",
    "oklch(0.62 0.1 60)",
    "eevee",
    2018,
  ),
  game(
    "sword",
    "Pokémon Sword",
    "Sword",
    "sword-shield",
    "oklch(0.62 0.14 245)",
    "zacian-crowned",
    2019,
    ["the-isle-of-armor-sword", "the-crown-tundra-sword"],
  ),
  game(
    "shield",
    "Pokémon Shield",
    "Shield",
    "sword-shield",
    "oklch(0.6 0.17 15)",
    "zamazenta-crowned",
    2019,
    ["the-isle-of-armor-shield", "the-crown-tundra-shield"],
  ),
  game(
    "brilliant-diamond",
    "Pokémon Brilliant Diamond",
    "Brilliant Diamond",
    "brilliant-diamond-shining-pearl",
    "oklch(0.62 0.11 240)",
    "dialga",
    2021,
  ),
  game(
    "shining-pearl",
    "Pokémon Shining Pearl",
    "Shining Pearl",
    "brilliant-diamond-shining-pearl",
    "oklch(0.72 0.09 350)",
    "palkia",
    2021,
  ),
  game(
    "legends-arceus",
    "Pokémon Legends: Arceus",
    "Legends: Arceus",
    "legends-arceus",
    "oklch(0.62 0.07 80)",
    "arceus",
    2022,
  ),
  game(
    "scarlet",
    "Pokémon Scarlet",
    "Scarlet",
    "scarlet-violet",
    "oklch(0.58 0.2 30)",
    "koraidon",
    2022,
    ["the-teal-mask-scarlet", "the-indigo-disk-scarlet"],
  ),
  game(
    "violet",
    "Pokémon Violet",
    "Violet",
    "scarlet-violet",
    "oklch(0.5 0.17 300)",
    "miraidon",
    2022,
    ["the-teal-mask-violet", "the-indigo-disk-violet"],
  ),
  game(
    "legends-za",
    "Pokémon Legends: Z-A",
    "Legends: Z-A",
    "legends-za",
    "oklch(0.55 0.14 160)",
    "zygarde-50",
    2025,
    ["mega-dimension"],
  ),
] as const satisfies readonly GameConfig[];

export type GameId = (typeof GAME_LIST)[number]["id"];

export const GAMES = Object.fromEntries(GAME_LIST.map((g) => [g.id, g])) as Record<
  GameId,
  GameConfig
>;
export const GAME_IDS = GAME_LIST.map((g) => g.id) as GameId[];
export const DEFAULT_GAME: GameId = "sword";

export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && Object.hasOwn(GAMES, value);
}

export function getGame(id: GameId): GameConfig {
  return GAMES[id];
}

export function getVersionGroup(id: string): VersionGroupConfig {
  const vg = (VERSION_GROUPS as Record<string, VersionGroupConfig>)[id];
  if (!vg) throw new Error(`Unknown version group ${id}`);
  return vg;
}

export function getGameVersionGroup(id: GameId): VersionGroupConfig {
  return getVersionGroup(GAMES[id].versionGroup);
}

export function getGameGeneration(id: GameId): number {
  return getGameVersionGroup(id).generation;
}

/** The dex shown by default and used for the library card progress. */
export function getDefaultPokedex(id: GameId): GamePokedex {
  return getGameVersionGroup(id).pokedexes[0];
}

export interface GenerationGroup {
  generation: number;
  label: string;
  years: string;
  games: GameConfig[];
}

/** Games grouped by generation, oldest first, keeping declaration order inside. */
export function getGamesByGeneration(games: readonly GameConfig[] = GAME_LIST): GenerationGroup[] {
  const groups = new Map<number, GameConfig[]>();
  for (const g of games) {
    const generation = getVersionGroup(g.versionGroup).generation;
    groups.set(generation, [...(groups.get(generation) ?? []), g]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([generation, list]) => ({
      generation,
      label: GENERATIONS[generation]?.label ?? `Geração ${generation}`,
      years: GENERATIONS[generation]?.years ?? "",
      games: list,
    }));
}

/** Other games sharing a version group (Sword ↔ Shield). */
export function getSiblingGames(id: GameId): GameConfig[] {
  const vg = GAMES[id].versionGroup;
  return GAME_LIST.filter((g) => g.versionGroup === vg && g.id !== id);
}
