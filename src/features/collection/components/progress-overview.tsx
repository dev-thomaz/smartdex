"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { GAMES, getGameVersionGroup, type GameId } from "@/features/games/config";
import { useCatalog } from "@/features/pokedex/catalog-context";
import { ALL_DEX } from "@/features/pokedex/filters";
import { cn } from "@/lib/utils";
import { useCollectionStore } from "@/stores/collection-store";
import { usePreferencesStore } from "@/stores/preferences-store";

import { computeProgress } from "../progress";
import { ProgressMeter } from "./progress-meter";

const EMPTY: ReadonlySet<number> = new Set();

export function ProgressOverview() {
  const { game: currentGame, entries } = useCatalog();
  const status = useCollectionStore((s) => s.status);
  const caughtByGame = useCollectionStore((s) => s.caught);
  const updateView = usePreferencesStore((s) => s.updateView);
  const ready = status === "ready" || status === "error";

  // Current game first; only games sharing this catalog's version group can be computed here.
  const games = (Object.keys(GAMES) as GameId[])
    .filter((g) => GAMES[g].versionGroup === GAMES[currentGame].versionGroup)
    .sort((a, b) => (a === currentGame ? -1 : b === currentGame ? 1 : 0));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Progresso</h1>
        <p className="text-muted-foreground">
          Cada jogo tem seu próprio progresso. Ele fica salvo neste navegador.
        </p>
      </header>

      {games.map((game) => {
        const caught = caughtByGame[game] ?? EMPTY;
        const dexes = getGameVersionGroup(game).pokedexes;
        const rows = [
          ...dexes.map((d) => ({ id: d.id, label: d.label })),
          { id: ALL_DEX, label: "Todos os compatíveis com o jogo" },
        ];
        return (
          <section
            key={game}
            aria-labelledby={`progress-${game}`}
            className={cn(
              "flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-(--shadow-card) sm:p-6",
              game === currentGame && "border-foreground/20",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`progress-${game}`} className="text-xl font-bold">
                {GAMES[game].name}
              </h2>
              {game === currentGame && (
                <span className="rounded-lg bg-secondary px-2.5 py-1 text-sm font-semibold">
                  Jogo atual
                </span>
              )}
            </div>
            <ul className="flex flex-col gap-5">
              {rows.map((row) => {
                const progress = ready ? computeProgress(entries, caught, row.id) : null;
                return (
                  <li key={row.id} className="flex flex-col gap-2">
                    <ProgressMeter label={row.label} progress={progress} size="sm" />
                    {progress && progress.missing > 0 && (
                      <Link
                        href={`/${game}`}
                        onClick={() => updateView(game, { dex: row.id, status: "missing" })}
                        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary hover:underline"
                      >
                        Ver os {progress.missing} que faltam
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
