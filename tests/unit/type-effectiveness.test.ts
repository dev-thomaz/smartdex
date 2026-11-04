import { describe, expect, it } from "vitest";

import {
  attackMultiplier,
  defensiveProfile,
  formatMultiplier,
  getTypeChart,
} from "@/features/pokemon/type-effectiveness";
import { buildTypeChart, type TypeEfficacyRow } from "@/lib/api/pokeapi/resolve";

const gen8 = getTypeChart(8);
const pick = (list: { type: string; multiplier: number }[]) =>
  Object.fromEntries(list.map((m) => [m.type, m.multiplier]));

describe("generated Gen VIII type chart", () => {
  it("contains the 18 types including Fairy", () => {
    expect(gen8.types).toHaveLength(18);
    expect(gen8.types).toContain("fairy");
  });

  it("has known single matchups", () => {
    expect(attackMultiplier(gen8.chart, "water", "fire")).toBe(2);
    expect(attackMultiplier(gen8.chart, "normal", "ghost")).toBe(0);
    expect(attackMultiplier(gen8.chart, "dragon", "fairy")).toBe(0);
    expect(attackMultiplier(gen8.chart, "ghost", "steel")).toBe(1); // changed in Gen VI
  });
});

describe("defensiveProfile", () => {
  it("multiplies dual types (Charizard: Fire/Flying)", () => {
    const p = defensiveProfile(["fire", "flying"], gen8);
    expect(pick(p.weaknesses)).toEqual({ rock: 4, water: 2, electric: 2 });
    expect(pick(p.immunities)).toEqual({ ground: 0 });
    expect(pick(p.resistances)).toMatchObject({ grass: 0.25, bug: 0.25, fire: 0.5, fighting: 0.5 });
  });

  it("orders weaknesses from strongest to weakest", () => {
    const p = defensiveProfile(["grass", "bug"], gen8);
    expect(p.weaknesses[0]).toEqual({ type: "fire", multiplier: 4 });
  });

  it("lists every immunity of a Ghost/Normal-proof type (Gengar: Ghost/Poison)", () => {
    const p = defensiveProfile(["ghost", "poison"], gen8);
    expect(pick(p.immunities)).toEqual({ normal: 0, fighting: 0 });
    expect(pick(p.weaknesses)).toEqual({ ground: 2, ghost: 2, psychic: 2, dark: 2 });
  });

  it("formats fractional multipliers", () => {
    expect(formatMultiplier(0.25)).toBe("¼×");
    expect(formatMultiplier(0.5)).toBe("½×");
    expect(formatMultiplier(4)).toBe("4×");
  });
});

describe("buildTypeChart history", () => {
  const rows: TypeEfficacyRow[] = [
    // Ghost vs Steel was 0.5× up to Gen V, neutral since Gen VI.
    { attacker: "ghost", defender: "steel", factor: 100, past: [{ generation: 5, factor: 50 }] },
    // Ghost vs Psychic was 0× in Gen I, 2× afterwards.
    { attacker: "ghost", defender: "psychic", factor: 200, past: [{ generation: 1, factor: 0 }] },
  ];

  it("applies the value of the generation", () => {
    expect(buildTypeChart(rows, ["ghost", "steel", "psychic"], 5).ghost).toEqual({
      steel: 0.5,
      psychic: 2,
    });
    expect(buildTypeChart(rows, ["ghost", "steel", "psychic"], 8).ghost).toEqual({ psychic: 2 });
    expect(buildTypeChart(rows, ["ghost", "psychic"], 1).ghost).toEqual({ psychic: 0 });
  });
});
