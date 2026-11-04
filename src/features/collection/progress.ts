import { inDex, type FilterableEntry } from "@/features/pokedex/filters";

/** `GameProgress` in the domain vocabulary. */
export interface Progress {
  caught: number;
  total: number;
  missing: number;
  /** 0–100, rounded down to one decimal so 100% only shows when complete. */
  percent: number;
}

/** Progress over an explicit set of dex species ids; duplicates are ignored. */
export function computeProgressForSpecies(
  speciesIds: readonly number[],
  caught: ReadonlySet<number>,
): Progress {
  const unique = new Set(speciesIds);
  let count = 0;
  for (const id of unique) if (caught.has(id)) count += 1;
  return toProgress(count, unique.size);
}

function toProgress(caught: number, total: number): Progress {
  // Division by zero guard: an empty dex is 0%, never NaN.
  const percent = total === 0 ? 0 : Math.floor((caught / total) * 1000) / 10;
  return { caught, total, missing: total - caught, percent };
}

export function computeProgress(
  entries: readonly FilterableEntry[],
  caught: ReadonlySet<number>,
  dex: string,
): Progress {
  let total = 0;
  let count = 0;
  for (const entry of entries) {
    if (!inDex(entry, dex)) continue;
    total += 1;
    if (caught.has(entry.id)) count += 1;
  }
  return toProgress(count, total);
}

export type GameProgress = Progress;
