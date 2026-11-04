import { inDex, type FilterableEntry } from "@/features/pokedex/filters";

export interface Progress {
  caught: number;
  total: number;
  missing: number;
  /** 0–100, rounded down to one decimal so 100% only shows when complete. */
  percent: number;
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
  const percent = total === 0 ? 0 : Math.floor((count / total) * 1000) / 10;
  return { caught: count, total, missing: total - count, percent };
}
