import { describe, expect, it } from "vitest";

import {
  ALL_DEX,
  countActiveFilters,
  displayNumber,
  filterEntries,
  formatNumber,
  matchesQuery,
  normalizeSearch,
  toggleType,
  type FilterableEntry,
  type PokedexQuery,
} from "@/features/pokedex/filters";

const entries: FilterableEntry[] = [
  { id: 810, slug: "grookey", name: "Grookey", types: ["grass"], dex: { galar: 1 } },
  { id: 813, slug: "scorbunny", name: "Scorbunny", types: ["fire"], dex: { galar: 4 } },
  { id: 6, slug: "charizard", name: "Charizard", types: ["fire", "flying"], dex: { galar: 380 } },
  { id: 122, slug: "mr-mime", name: "Mr. Mime", types: ["ice", "psychic"], dex: { galar: 166 } },
  {
    id: 79,
    slug: "slowpoke",
    name: "Slowpoke",
    types: ["water", "psychic"],
    dex: { "isle-of-armor": 1 },
  },
  { id: 151, slug: "mew", name: "Mew", types: ["psychic"], dex: {} },
];

const base: PokedexQuery = { dex: "galar", status: "all", types: [], sort: "dex", query: "" };
const names = (list: FilterableEntry[]) => list.map((e) => e.name);

describe("search", () => {
  it("normalizes accents, case and punctuation", () => {
    expect(normalizeSearch("Mr. Mime")).toBe("mrmime");
    expect(normalizeSearch("Flabébé")).toBe("flabebe");
  });

  it("matches partial names regardless of punctuation", () => {
    expect(matchesQuery(entries[3], "galar", "mr mi")).toBe(true);
    expect(matchesQuery(entries[3], "galar", "MIME")).toBe(true);
    expect(matchesQuery(entries[0], "galar", "char")).toBe(false);
  });

  it("matches regional or national numbers, with or without #", () => {
    expect(matchesQuery(entries[0], "galar", "1")).toBe(true);
    expect(matchesQuery(entries[0], "galar", "#810")).toBe(true);
    expect(matchesQuery(entries[0], "galar", "8")).toBe(false);
  });

  it("returns every entry for a blank query", () => {
    expect(filterEntries(entries, { ...base, query: "   " }, new Set())).toHaveLength(4);
  });
});

describe("filters", () => {
  it("limits results to the selected dex, or all compatible species", () => {
    expect(names(filterEntries(entries, base, new Set()))).toEqual([
      "Grookey",
      "Scorbunny",
      "Mr. Mime",
      "Charizard",
    ]);
    expect(filterEntries(entries, { ...base, dex: "isle-of-armor" }, new Set())).toHaveLength(1);
    expect(filterEntries(entries, { ...base, dex: ALL_DEX }, new Set())).toHaveLength(6);
  });

  it("filters by caught status", () => {
    const caught = new Set([813]);
    expect(names(filterEntries(entries, { ...base, status: "caught" }, caught))).toEqual([
      "Scorbunny",
    ]);
    expect(names(filterEntries(entries, { ...base, status: "missing" }, caught))).not.toContain(
      "Scorbunny",
    );
  });

  it("requires every selected type", () => {
    expect(names(filterEntries(entries, { ...base, types: ["fire"] }, new Set()))).toEqual([
      "Scorbunny",
      "Charizard",
    ]);
    expect(
      names(filterEntries(entries, { ...base, types: ["fire", "flying"] }, new Set())),
    ).toEqual(["Charizard"]);
  });

  it("sorts by regional number, national number in the all view, or name", () => {
    expect(names(filterEntries(entries, { ...base, dex: ALL_DEX }, new Set()))[0]).toBe(
      "Charizard",
    );
    expect(names(filterEntries(entries, { ...base, sort: "name" }, new Set()))).toEqual([
      "Charizard",
      "Grookey",
      "Mr. Mime",
      "Scorbunny",
    ]);
  });

  it("keeps at most two type filters, dropping the oldest", () => {
    expect(toggleType(["fire"], "water")).toEqual(["fire", "water"]);
    expect(toggleType(["fire", "water"], "grass")).toEqual(["water", "grass"]);
    expect(toggleType(["fire", "water"], "fire")).toEqual(["water"]);
  });

  it("counts active filters", () => {
    expect(countActiveFilters({ dex: "galar", status: "all", types: [], sort: "dex" }, "")).toBe(0);
    expect(
      countActiveFilters({ dex: "galar", status: "missing", types: ["fire"], sort: "dex" }, "char"),
    ).toBe(3);
  });
});

describe("numbers", () => {
  it("shows regional numbers in a dex and national otherwise", () => {
    expect(displayNumber(entries[2], "galar")).toBe(380);
    expect(displayNumber(entries[2], ALL_DEX)).toBe(6);
    expect(formatNumber(7)).toBe("#007");
    expect(formatNumber(1010)).toBe("#1010");
  });
});
