/**
 * Pure Pokédex list logic: search, filters, sorting and display numbers.
 * Kept free of React so it is trivially testable and reusable.
 */

import { z } from "zod";

import { TYPE_NAMES, type CatalogEntry, type TypeName } from "@/types/domain";

/** Special dex id meaning "every species compatible with the game". */
export const ALL_DEX = "all";

export const statusFilterSchema = z.enum(["all", "caught", "missing"]);
export const sortOrderSchema = z.enum(["dex", "name"]);

export const pokedexViewSchema = z.object({
  dex: z.string().min(1),
  status: statusFilterSchema,
  types: z.array(z.enum(TYPE_NAMES)).max(2),
  sort: sortOrderSchema,
});

export type StatusFilter = z.infer<typeof statusFilterSchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;
export type PokedexView = z.infer<typeof pokedexViewSchema>;

/** Minimum entry shape the list logic needs. */
export type FilterableEntry = Pick<CatalogEntry, "id" | "slug" | "name" | "types" | "dex">;

export interface PokedexQuery extends PokedexView {
  query: string;
}

export const MAX_TYPE_FILTERS = 2;

export function defaultView(defaultDex: string): PokedexView {
  return { dex: defaultDex, status: "all", types: [], sort: "dex" };
}

/** Lowercase, strip accents and punctuation: "Mr. Mime" → "mrmime". */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Number shown on the card: regional number in a dex view, national otherwise. */
export function displayNumber(entry: FilterableEntry, dex: string): number {
  if (dex === ALL_DEX) return entry.id;
  return entry.dex[dex] ?? entry.id;
}

export function formatNumber(value: number): string {
  return `#${String(value).padStart(value >= 1000 ? 4 : 3, "0")}`;
}

export function inDex(entry: FilterableEntry, dex: string): boolean {
  return dex === ALL_DEX || entry.dex[dex] !== undefined;
}

export function matchesQuery(entry: FilterableEntry, dex: string, rawQuery: string): boolean {
  const trimmed = rawQuery.trim();
  if (!trimmed) return true;
  const numeric = trimmed.replace(/^#/, "");
  if (/^\d+$/.test(numeric)) {
    const n = Number(numeric);
    return displayNumber(entry, dex) === n || entry.id === n;
  }
  const query = normalizeSearch(trimmed);
  if (!query) return true;
  return normalizeSearch(entry.name).includes(query) || normalizeSearch(entry.slug).includes(query);
}

export function matchesTypes(entry: FilterableEntry, types: readonly TypeName[]): boolean {
  return types.every((type) => entry.types.includes(type));
}

export function matchesStatus(
  entry: FilterableEntry,
  status: StatusFilter,
  caught: ReadonlySet<number>,
): boolean {
  if (status === "all") return true;
  const isCaught = caught.has(entry.id);
  return status === "caught" ? isCaught : !isCaught;
}

export function filterEntries<T extends FilterableEntry>(
  entries: readonly T[],
  query: PokedexQuery,
  caught: ReadonlySet<number>,
): T[] {
  const result = entries.filter(
    (entry) =>
      inDex(entry, query.dex) &&
      matchesStatus(entry, query.status, caught) &&
      matchesTypes(entry, query.types) &&
      matchesQuery(entry, query.dex, query.query),
  );
  if (query.sort === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name, "en"));
  } else {
    result.sort((a, b) => displayNumber(a, query.dex) - displayNumber(b, query.dex));
  }
  return result;
}

/** Toggle a type in the selection, keeping at most MAX_TYPE_FILTERS (oldest drops). */
export function toggleType(selected: readonly TypeName[], type: TypeName): TypeName[] {
  if (selected.includes(type)) return selected.filter((t) => t !== type);
  return [...selected, type].slice(-MAX_TYPE_FILTERS);
}

export function countActiveFilters(view: PokedexView, query: string): number {
  return (view.status !== "all" ? 1 : 0) + view.types.length + (query.trim() ? 1 : 0);
}
