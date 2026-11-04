/**
 * Pure helpers that resolve PokéAPI "current value + history" pairs into the
 * value valid for a specific generation or version group.
 *
 * PokéAPI semantics:
 * - `past_types` / `past_stats` / `past_abilities` / type `past_damage_relations`
 *   carry a `generation`: the LAST generation in which that past value applied.
 * - move `past_values` (`movechanges`) carry a `version_group`: the value
 *   applied in every version group BEFORE that one.
 */

import type { MoveCategory, TypeChart, TypeName } from "@/types/domain";

export interface GenerationalPast<T> {
  generation: number;
  value: T;
}

/** Value valid for `generation` given the current value and its history. */
export function resolveForGeneration<T>(
  current: T,
  past: GenerationalPast<T>[],
  generation: number,
): T {
  let best: GenerationalPast<T> | undefined;
  for (const entry of past) {
    if (entry.generation >= generation && (!best || entry.generation < best.generation)) {
      best = entry;
    }
  }
  return best ? best.value : current;
}

export interface MoveValues {
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: TypeName;
}

export interface MoveChange {
  /** `order` of the version group where the change took effect. */
  versionGroupOrder: number;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: TypeName | null;
}

/**
 * Applies move history: every change whose version group comes after the
 * target describes older values. Changes are applied from the newest to the
 * oldest so the earliest applicable change wins for each field.
 */
export function resolveMoveValues(
  current: MoveValues,
  changes: MoveChange[],
  targetOrder: number,
): MoveValues {
  const applicable = changes
    .filter((change) => change.versionGroupOrder > targetOrder)
    .sort((a, b) => b.versionGroupOrder - a.versionGroupOrder);
  const result = { ...current };
  for (const change of applicable) {
    if (change.power !== null) result.power = change.power;
    if (change.accuracy !== null) result.accuracy = change.accuracy;
    if (change.pp !== null) result.pp = change.pp;
    if (change.type !== null) result.type = change.type;
  }
  return result;
}

const PHYSICAL_BEFORE_GEN_4: ReadonlySet<TypeName> = new Set([
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
]);

/** Before Gen IV the damage category depended on the move's type. */
export function resolveMoveCategory(
  category: MoveCategory,
  type: TypeName,
  generation: number,
): MoveCategory {
  if (generation >= 4 || category === "status") return category;
  return PHYSICAL_BEFORE_GEN_4.has(type) ? "physical" : "special";
}

export interface TypeEfficacyRow {
  attacker: TypeName;
  defender: TypeName;
  /** Multiplier ×100 as stored by PokéAPI (0, 50, 100, 200). */
  factor: number;
  past: { generation: number; factor: number }[];
}

/** Builds the type chart valid for a generation, storing only factors ≠ 1. */
export function buildTypeChart(
  rows: TypeEfficacyRow[],
  types: TypeName[],
  generation: number,
): TypeChart {
  const valid = new Set(types);
  const chart = Object.fromEntries(types.map((t) => [t, {}])) as TypeChart;
  for (const row of rows) {
    if (!valid.has(row.attacker) || !valid.has(row.defender)) continue;
    const factor = resolveForGeneration(
      row.factor,
      row.past.map((p) => ({ generation: p.generation, value: p.factor })),
      generation,
    );
    if (factor !== 100) chart[row.attacker][row.defender] = factor / 100;
  }
  return chart;
}

const MACHINE_ITEM = /^(tm|hm|tr)(\d+)$/;

/** PokéAPI machine item → in-game label: "tm08" → "TM08"; Gen IX uses three digits ("TM001"). */
export function machineLabel(item: string, generation: number): string | null {
  const match = item.match(MACHINE_ITEM);
  if (!match) return null;
  return `${match[1].toUpperCase()}${match[2].padStart(generation >= 9 ? 3 : 2, "0")}`;
}
