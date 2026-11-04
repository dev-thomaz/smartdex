"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";

import { PokemonArtwork } from "@/components/pokemon/pokemon-artwork";
import { TypeList } from "@/components/pokemon/type-badge";
import { useCatalog, type CardEntry } from "@/features/pokedex/catalog-context";
import { ALL_DEX, formatNumber, matchesQuery, normalizeSearch } from "@/features/pokedex/filters";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 8;

export function rankResults(entries: readonly CardEntry[], query: string): CardEntry[] {
  const q = normalizeSearch(query);
  return entries
    .filter((e) => matchesQuery(e, ALL_DEX, query))
    .map((e) => ({ e, starts: normalizeSearch(e.name).startsWith(q) ? 0 : 1 }))
    .sort((a, b) => a.starts - b.starts || a.e.id - b.e.id)
    .slice(0, MAX_RESULTS)
    .map(({ e }) => e);
}

/** Quick jump to any Pokémon of the selected game (combobox pattern). */
export function GlobalSearch({ className }: { className?: string }) {
  const { game, entries } = useCatalog();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(
    () => (query.trim() ? rankResults(entries, query) : []),
    [entries, query],
  );
  const expanded = open && query.trim().length > 0;

  function go(entry: CardEntry) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(`/${game}/pokemon/${entry.slug}`);
  }

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        Buscar Pokémon por nome ou número
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="search"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && results[active] ? `${listId}-${results[active].id}` : undefined
        }
        placeholder="Ir para Pokémon…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!expanded) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && results[active]) {
            e.preventDefault();
            go(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-11 w-full rounded-xl border border-input bg-card pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
      />
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Resultados"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-auto rounded-xl border bg-popover p-1.5 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              Nenhum Pokémon encontrado.
            </li>
          ) : (
            results.map((entry, index) => (
              <li
                key={entry.id}
                id={`${listId}-${entry.id}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(entry)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5",
                  index === active && "bg-accent",
                )}
              >
                <PokemonArtwork pokemonId={entry.artId} name="" size={36} />
                <span className="flex-1">
                  <span className="block font-semibold">{entry.name}</span>
                  <span className="tabular text-xs text-muted-foreground">
                    {formatNumber(entry.id)} nacional
                  </span>
                </span>
                <TypeList types={entry.types} size="sm" className="hidden sm:flex" />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
