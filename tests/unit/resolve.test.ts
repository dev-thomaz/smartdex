import { describe, expect, it } from "vitest";

import {
  resolveForGeneration,
  resolveMoveCategory,
  resolveMoveValues,
} from "@/lib/api/pokeapi/resolve";

describe("resolveForGeneration", () => {
  // Clefairy: Normal until Gen V, Fairy since Gen VI.
  const past = [{ generation: 5, value: ["normal"] }];

  it("uses the past value up to its last generation", () => {
    expect(resolveForGeneration(["fairy"], past, 3)).toEqual(["normal"]);
    expect(resolveForGeneration(["fairy"], past, 5)).toEqual(["normal"]);
  });

  it("uses the current value afterwards", () => {
    expect(resolveForGeneration(["fairy"], past, 6)).toEqual(["fairy"]);
    expect(resolveForGeneration(["fairy"], past, 8)).toEqual(["fairy"]);
  });

  it("picks the closest past entry when several exist", () => {
    const history = [
      { generation: 1, value: "a" },
      { generation: 4, value: "b" },
    ];
    expect(resolveForGeneration("c", history, 1)).toBe("a");
    expect(resolveForGeneration("c", history, 2)).toBe("b");
    expect(resolveForGeneration("c", history, 5)).toBe("c");
  });
});

describe("resolveMoveValues", () => {
  // Flamethrower: 95 power before X/Y (order 15), 90 since.
  const changes = [{ versionGroupOrder: 15, power: 95, accuracy: null, pp: null, type: null }];
  const current = { power: 90, accuracy: 100, pp: 15, type: "fire" as const };

  it("returns current values for later games", () => {
    expect(resolveMoveValues(current, changes, 22)).toEqual(current);
  });

  it("returns older values for earlier games, keeping unchanged fields", () => {
    expect(resolveMoveValues(current, changes, 14)).toEqual({ ...current, power: 95 });
  });

  it("applies the earliest applicable change last", () => {
    const multi = [
      { versionGroupOrder: 10, power: 50, accuracy: null, pp: null, type: null },
      { versionGroupOrder: 15, power: 70, accuracy: null, pp: 20, type: null },
    ];
    expect(resolveMoveValues(current, multi, 5)).toMatchObject({ power: 50, pp: 20 });
    expect(resolveMoveValues(current, multi, 12)).toMatchObject({ power: 70, pp: 20 });
  });
});

describe("resolveMoveCategory", () => {
  it("derives category from type before Gen IV", () => {
    expect(resolveMoveCategory("special", "dark", 3)).toBe("special");
    expect(resolveMoveCategory("physical", "fire", 3)).toBe("special");
    expect(resolveMoveCategory("special", "ghost", 3)).toBe("physical");
    expect(resolveMoveCategory("status", "fire", 3)).toBe("status");
    expect(resolveMoveCategory("physical", "fire", 8)).toBe("physical");
  });
});
