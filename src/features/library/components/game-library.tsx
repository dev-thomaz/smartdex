"use client";

import { ArrowRight, Search, SearchX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { GameDot } from "@/components/layout/game-switcher";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { GAMES, GENERATIONS, type GameId } from "@/features/games/config";
import { cn } from "@/lib/utils";
import { useCollectionStore } from "@/stores/collection-store";
import { usePreferencesStore } from "@/stores/preferences-store";

import { filterLibrary } from "../filter";
import type { LibraryCardData } from "../library";
import { GameCard } from "./game-card";

const chip =
  "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring";

export function GameLibrary({ cards }: { cards: LibraryCardData[] }) {
  const [query, setQuery] = useState("");
  const [generation, setGeneration] = useState<number | null>(null);
  const deferredQuery = useDeferredValue(query);
  const caughtByGame = useCollectionStore((s) => s.caught);
  const status = useCollectionStore((s) => s.status);
  const lastGame = usePreferencesStore((s) => s.lastGame);
  const setLastGame = usePreferencesStore((s) => s.setLastGame);
  const ready = status === "ready" || status === "error";

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const groups = useMemo(
    () => filterLibrary({ query: deferredQuery, generation }),
    [deferredQuery, generation],
  );
  const generations = useMemo(
    () => filterLibrary({ query: "", generation: null }).map((g) => g.generation),
    [],
  );
  const onOpen = useCallback((game: GameId) => setLastGame(game), [setLastGame]);
  const resultCount = groups.reduce((n, g) => n + g.games.length, 0);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <Logo />
          <div className="flex items-center gap-2">
            {lastGame && (
              <Link
                href={`/${lastGame}`}
                className="inline-flex h-11 max-w-56 items-center gap-2 rounded-xl border bg-card px-3 text-sm font-semibold hover:bg-accent"
              >
                <GameDot game={lastGame} />
                <span className="truncate">
                  <span className="hidden sm:inline">Continuar: </span>
                  {GAMES[lastGame].shortName}
                </span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="conteudo"
        className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-10"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold sm:text-3xl">Qual jogo você está jogando?</h1>
          <p className="text-muted-foreground">
            Cada jogo tem sua própria Pokédex e seu próprio progresso. Você pode trocar quando
            quiser.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative max-w-xl">
            <label htmlFor="game-search" className="sr-only">
              Buscar jogo pelo nome
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="game-search"
              type="search"
              autoComplete="off"
              placeholder="Buscar jogo (ex.: FireRed, Sword)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
              }}
              className="h-12 w-full rounded-xl border border-input bg-card pr-11 pl-11 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            )}
          </div>
          <div
            role="radiogroup"
            aria-label="Filtrar por geração"
            className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-0.5"
          >
            {[null, ...generations].map((g) => {
              const active = generation === g;
              return (
                <button
                  key={g ?? "all"}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setGeneration(g)}
                  className={cn(
                    chip,
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  {g === null ? "Todas" : (GENERATIONS[g]?.label.replace("Geração ", "Ger. ") ?? g)}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {resultCount === 1 ? "1 jogo" : `${resultCount} jogos`}
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-14 text-center">
            <SearchX className="size-10 text-muted-foreground" aria-hidden="true" />
            <p className="text-lg font-semibold">Nenhum jogo encontrado</p>
            <Button
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => {
                setQuery("");
                setGeneration(null);
              }}
            >
              Ver todos os jogos
            </Button>
          </div>
        ) : (
          groups.map((group) => (
            <section
              key={group.generation}
              aria-labelledby={`gen-${group.generation}`}
              className="flex flex-col gap-3"
            >
              <h2
                id={`gen-${group.generation}`}
                className="flex items-baseline gap-2 text-xl font-bold"
              >
                {group.label}{" "}
                <span className="text-sm font-normal text-muted-foreground">{group.years}</span>
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {group.games.map((game) => {
                  const card = cardById.get(game.id as GameId);
                  if (!card) return null;
                  return (
                    <GameCard
                      key={game.id}
                      card={card}
                      caught={caughtByGame[card.id]}
                      ready={ready}
                      current={lastGame === card.id}
                      onOpen={onOpen}
                    />
                  );
                })}
              </ul>
            </section>
          ))
        )}

        <p className="text-xs text-muted-foreground">
          As capas são ilustrações com artes oficiais da PokéAPI, não as capas originais dos jogos.
          Dados: PokéAPI. Projeto de fãs, sem afiliação com Nintendo, Game Freak ou The Pokémon
          Company.
        </p>
      </main>
    </div>
  );
}
