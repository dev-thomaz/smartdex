import { describe, expect, it } from "vitest";

import { computeProgress } from "@/features/collection/progress";
import { ALL_DEX, type FilterableEntry } from "@/features/pokedex/filters";

const entries: FilterableEntry[] = [
  { id: 1, slug: "a", name: "A", types: ["grass"], dex: { galar: 1 } },
  { id: 2, slug: "b", name: "B", types: ["grass"], dex: { galar: 2 } },
  { id: 3, slug: "c", name: "C", types: ["grass"], dex: { galar: 3 } },
  { id: 4, slug: "d", name: "D", types: ["fire"], dex: { "crown-tundra": 1 } },
];

describe("computeProgress", () => {
  it("counts caught and missing species in a dex", () => {
    expect(computeProgress(entries, new Set([1, 4]), "galar")).toEqual({
      caught: 1,
      total: 3,
      missing: 2,
      percent: 33.3,
    });
  });

  it("ignores caught species outside the selected dex", () => {
    expect(computeProgress(entries, new Set([4]), "galar").caught).toBe(0);
    expect(computeProgress(entries, new Set([4]), ALL_DEX).caught).toBe(1);
  });

  it("only reaches 100% when complete and handles empty dexes", () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({ ...entries[0], id: i + 1 }));
    const almost = new Set(many.slice(0, 999).map((e) => e.id));
    expect(computeProgress(many, almost, "galar").percent).toBe(99.9);
    expect(computeProgress([], new Set(), "galar")).toEqual({
      caught: 0,
      total: 0,
      missing: 0,
      percent: 0,
    });
  });
});
