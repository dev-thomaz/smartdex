"use client";

import { Info, SearchX } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ProgressMeter } from "@/features/collection/components/progress-meter";
import { computeProgress } from "@/features/collection/progress";
import { GAMES, getGameVersionGroup } from "@/features/games/config";
import { useCaughtSet, useCollectionStore } from "@/stores/collection-store";
import { defaultViewFor, usePreferencesStore } from "@/stores/preferences-store";

import { coverageNotices } from "@/features/library/coverage";

import { useCatalog } from "../catalog-context";
import { ALL_DEX, displayNumber, filterEntries, type PokedexView as View } from "../filters";
import { ActiveFilters, DexTabs, FilterSheet, SearchField, StatusChips } from "./pokedex-toolbar";
import { PokemonCard } from "./pokemon-card";

const PAGE_SIZE = 48;

export function PokedexView() {
  const { game, entries, dexes: dexSizes, hasOutsideDex, coverage } = useCatalog();
  const dexes = getGameVersionGroup(game).pokedexes;
  const sizes = Object.fromEntries(dexSizes.map((d) => [d.id, d.size]));
  const notices = coverageNotices(coverage);
  const storedView = usePreferencesStore((s) => s.views[game]);
  const query = usePreferencesStore((s) => s.queries[game] ?? "");
  const updateView = usePreferencesStore((s) => s.updateView);
  const setQuery = usePreferencesStore((s) => s.setQuery);
  const resetView = usePreferencesStore((s) => s.resetView);
  const caught = useCaughtSet(game);
  const collectionStatus = useCollectionStore((s) => s.status);
  const toggle = useCollectionStore((s) => s.toggle);

  const view: View = useMemo(() => {
    const fallback = defaultViewFor(game);
    if (!storedView) return fallback;
    // Ignore a stored dex id that no longer exists for this game.
    const validDex =
      (storedView.dex === ALL_DEX && hasOutsideDex) || dexes.some((d) => d.id === storedView.dex);
    return validDex ? storedView : { ...storedView, dex: fallback.dex };
  }, [storedView, game, dexes, hasOutsideDex]);

  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => filterEntries(entries, { ...view, query: deferredQuery }, caught),
    [entries, view, deferredQuery, caught],
  );

  const progress = useMemo(
    () =>
      collectionStatus === "ready" || collectionStatus === "error"
        ? computeProgress(entries, caught, view.dex)
        : null,
    [entries, caught, view.dex, collectionStatus],
  );

  // Incremental rendering: show PAGE_SIZE cards, add more near the end.
  const filterKey = `${game}|${view.dex}|${view.status}|${view.types.join(",")}|${view.sort}|${deferredQuery}`;
  const [paging, setPaging] = useState({ key: filterKey, count: PAGE_SIZE });
  const count = paging.key === filterKey ? paging.count : PAGE_SIZE;
  const visible = filtered.slice(0, count);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = count < filtered.length;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (items) => {
        if (items.some((i) => i.isIntersecting)) {
          setPaging({ key: filterKey, count: count + PAGE_SIZE });
        }
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filterKey, count, hasMore]);

  const onToggle = useCallback((id: number) => void toggle(game, id), [toggle, game]);
  const dexLabel =
    view.dex === ALL_DEX
      ? "Todos compatíveis"
      : (dexes.find((d) => d.id === view.dex)?.label ?? "Pokédex");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{GAMES[game].name}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{dexLabel}</h1>
        </div>
        <ProgressMeter label="Capturados" progress={progress} className="w-full lg:max-w-sm" />
      </header>

      {notices.length > 0 && (
        <p className="flex items-start gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-foreground">Dados parciais neste jogo.</strong>{" "}
            {notices.map((n) => n.text).join(" ")} A Pokédex e o progresso funcionam normalmente.
          </span>
        </p>
      )}

      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 flex flex-col gap-3 border-b bg-background/95 px-4 pt-2 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="flex gap-2">
          <SearchField game={game} value={query} onChange={(q) => setQuery(game, q)} />
          <FilterSheet view={view} onChange={(patch) => updateView(game, patch)} />
        </div>
        <DexTabs
          dexes={dexes}
          sizes={sizes}
          showAll={hasOutsideDex}
          value={view.dex}
          onChange={(dex) => updateView(game, { dex })}
        />
      </div>

      <div className="flex flex-col gap-3">
        <StatusChips value={view.status} onChange={(status) => updateView(game, { status })} />
        <ActiveFilters
          view={view}
          query={query}
          onRemoveType={(type) => updateView(game, { types: view.types.filter((t) => t !== type) })}
          onClearQuery={() => setQuery(game, "")}
          onReset={() => resetView(game)}
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filtered.length === 1 ? "1 Pokémon" : `${filtered.length} Pokémon`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
          <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-lg font-semibold">Nenhum Pokémon encontrado</p>
          <p className="max-w-sm text-muted-foreground">
            Tente outro nome ou número, ou remova alguns filtros.
          </p>
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => resetView(game)}>
            Limpar busca e filtros
          </Button>
        </div>
      ) : (
        <>
          <ul
            aria-label="Pokémon"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          >
            {visible.map((entry, index) => (
              <PokemonCard
                key={entry.id}
                game={game}
                entry={entry}
                number={displayNumber(entry, view.dex)}
                caught={caught.has(entry.id)}
                onToggle={onToggle}
                priority={index < 6}
              />
            ))}
          </ul>
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setPaging({ key: filterKey, count: count + PAGE_SIZE })}
              >
                Mostrar mais ({filtered.length - count} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
