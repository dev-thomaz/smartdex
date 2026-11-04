import { describe, expect, it } from "vitest";

import { computeProgressForSpecies } from "@/features/collection/progress";
import {
  GAME_IDS,
  GAMES,
  getDefaultPokedex,
  getGamesByGeneration,
  getSiblingGames,
  isGameId,
} from "@/features/games/config";
import { coverageNotices, isPartialCoverage } from "@/features/library/coverage";
import { filterLibrary } from "@/features/library/filter";
import { getLibraryCards } from "@/features/library/library";
import { getCatalog } from "@/features/pokedex/catalog";
import { machineLabel } from "@/lib/api/pokeapi/resolve";

const cards = getLibraryCards();
const card = (id: string) => cards.find((c) => c.id === id)!;

describe("game catalog", () => {
  it("lists every configured mainline game, without spin-offs", () => {
    expect(cards.map((c) => c.id)).toEqual(GAME_IDS);
    expect(GAME_IDS).toHaveLength(41);
    for (const id of [
      "red",
      "gold",
      "firered",
      "platinum",
      "black-2",
      "x",
      "ultra-moon",
      "lets-go-eevee",
      "sword",
      "shining-pearl",
      "legends-arceus",
      "violet",
      "legends-za",
    ]) {
      expect(isGameId(id)).toBe(true);
    }
    for (const spinOff of ["colosseum", "xd", "champions", "pokemon-go"])
      expect(isGameId(spinOff)).toBe(false);
  });

  it("groups games by generation from oldest to newest", () => {
    const groups = getGamesByGeneration();
    expect(groups.map((g) => g.generation)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const gen3 = groups.find((g) => g.generation === 3)!.games.map((g) => g.id);
    expect(gen3).toEqual(["ruby", "sapphire", "firered", "leafgreen", "emerald"]);
    expect(groups.find((g) => g.generation === 8)!.games.map((g) => g.id)).toContain(
      "legends-arceus",
    );
  });

  it("filters the library by name and generation", () => {
    expect(
      filterLibrary({ query: "fire", generation: null }).flatMap((g) => g.games.map((x) => x.id)),
    ).toEqual(["firered"]);
    expect(filterLibrary({ query: "Shining Péarl", generation: null })[0].games[0].id).toBe(
      "shining-pearl",
    );
    const gen7 = filterLibrary({ query: "", generation: 7 });
    expect(gen7).toHaveLength(1);
    expect(gen7[0].games.map((g) => g.id)).toEqual([
      "sun",
      "moon",
      "ultra-sun",
      "ultra-moon",
      "lets-go-pikachu",
      "lets-go-eevee",
    ]);
    expect(filterLibrary({ query: "zzz", generation: null })).toEqual([]);
  });

  it("knows sibling versions that share data", () => {
    expect(getSiblingGames("firered").map((g) => g.id)).toEqual(["leafgreen"]);
    expect(getSiblingGames("crystal")).toEqual([]);
  });
});

describe("default dex totals", () => {
  // Official sizes of each game's main dex.
  const expected: Record<string, number> = {
    red: 151,
    gold: 251,
    ruby: 202,
    firered: 151,
    diamond: 151,
    platinum: 210,
    heartgold: 256,
    black: 156,
    "black-2": 301,
    x: 457,
    "omega-ruby": 211,
    sun: 302,
    "ultra-sun": 403,
    "lets-go-pikachu": 153,
    sword: 400,
    "brilliant-diamond": 151,
    "legends-arceus": 242,
    scarlet: 400,
    "legends-za": 232,
  };

  it.each(Object.entries(expected))("%s uses its own dex size (%i)", (id, size) => {
    expect(new Set(card(id).defaultDexSpecies).size).toBe(size);
  });

  it("uses the National Dex of the game's era, not of the API", () => {
    const national = (id: keyof typeof GAMES) =>
      getCatalog(GAMES[id].versionGroup).dexes.find((d) => d.id === "national")?.size;
    expect(national("firered")).toBe(386);
    expect(national("heartgold")).toBe(493);
    expect(national("brilliant-diamond")).toBe(493);
    expect(national("x")).toBe(721);
    expect(national("sword")).toBeUndefined();
  });

  it("each card total matches the catalog's default dex", () => {
    for (const c of cards) {
      const game = GAMES[c.id];
      const dex = getDefaultPokedex(c.id).id;
      const size = getCatalog(game.versionGroup).dexes.find((d) => d.id === dex)?.size;
      expect(c.defaultDexSpecies.length).toBe(size);
    }
  });

  it("counts a species present in several dexes once", () => {
    const { dexes, entries } = getCatalog("sword-shield");
    const sum = dexes.reduce((n, d) => n + d.size, 0);
    const unique = entries.filter((e) => Object.keys(e.dex).length > 0).length;
    expect(sum).toBe(821);
    expect(unique).toBe(584); // Zigzagoon, Eevee… appear in Galar and a DLC dex
  });
});

describe("card progress", () => {
  const firered = card("firered").defaultDexSpecies;

  it("is zero for a game without captures", () => {
    expect(computeProgressForSpecies(firered, new Set())).toEqual({
      caught: 0,
      total: 151,
      missing: 151,
      percent: 0,
    });
  });

  it("only counts captures that belong to the dex", () => {
    // 1 Bulbasaur, 25 Pikachu (Kanto) + 152 Chikorita (not in FireRed's Kanto dex)
    expect(computeProgressForSpecies(firered, new Set([1, 25, 152])).caught).toBe(2);
  });

  it("computes the percentage and guards against an empty dex", () => {
    const half = new Set(firered.slice(0, 102));
    expect(computeProgressForSpecies(firered, half).percent).toBe(67.5);
    expect(computeProgressForSpecies([], new Set([1])).percent).toBe(0);
    expect(computeProgressForSpecies([1, 1, 2], new Set([1]))).toMatchObject({
      caught: 1,
      total: 2,
    });
  });
});

describe("coverage states", () => {
  it("flags known gaps honestly", () => {
    expect(isPartialCoverage(card("sword").coverage)).toBe(false);
    expect(coverageNotices(card("legends-za").coverage).map((n) => n.area)).toEqual(
      expect.arrayContaining(["learnsets", "encounters"]),
    );
    expect(coverageNotices(card("scarlet").coverage).map((n) => n.area)).toContain("encounters");
    expect(coverageNotices(card("brilliant-diamond").coverage).map((n) => n.area)).toContain(
      "machines",
    );
  });
});

describe("machineLabel", () => {
  it("formats machines per generation", () => {
    expect(machineLabel("tm08", 8)).toBe("TM08");
    expect(machineLabel("hm03", 4)).toBe("HM03");
    expect(machineLabel("tr02", 8)).toBe("TR02");
    expect(machineLabel("tm01", 9)).toBe("TM001");
    expect(machineLabel("poke-ball", 8)).toBeNull();
  });
});
