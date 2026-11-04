"use client";

import { CircleCheck, Info } from "lucide-react";
import Link from "next/link";
import { memo, useId } from "react";

import { PokemonArtwork } from "@/components/pokemon/pokemon-artwork";
import { computeProgressForSpecies } from "@/features/collection/progress";
import { GAMES, GENERATIONS, getGameVersionGroup, type GameId } from "@/features/games/config";
import { cn } from "@/lib/utils";

import { isPartialCoverage } from "../coverage";
import type { LibraryCardData } from "../library";

const EMPTY: ReadonlySet<number> = new Set();

interface GameCardProps {
  card: LibraryCardData;
  caught: ReadonlySet<number> | undefined;
  /** False until IndexedDB has been read, to avoid flashing 0. */
  ready: boolean;
  current: boolean;
  onOpen: (game: GameId) => void;
}

export const GameCard = memo(function GameCard({
  card,
  caught,
  ready,
  current,
  onOpen,
}: GameCardProps) {
  const game = GAMES[card.id];
  const vg = getGameVersionGroup(card.id);
  const progress = computeProgressForSpecies(card.defaultDexSpecies, caught ?? EMPTY);
  const complete = ready && progress.total > 0 && progress.caught === progress.total;
  const partial = isPartialCoverage(card.coverage);
  const noDex = progress.total === 0;
  const generation = GENERATIONS[vg.generation]?.label ?? `Geração ${vg.generation}`;
  const uid = useId();
  const nameId = `${uid}-name`;
  const progressId = `${uid}-progress`;
  const statusId = `${uid}-status`;
  const statusText = [current && "Jogando agora", partial && "Dados parciais"]
    .filter(Boolean)
    .join(". ");

  return (
    <li className="flex">
      <Link
        href={`/${card.id}`}
        onClick={() => onOpen(card.id)}
        aria-current={current ? "true" : undefined}
        aria-labelledby={[nameId, progressId, statusText && statusId].filter(Boolean).join(" ")}
        className={cn(
          "group flex w-full flex-col overflow-hidden rounded-3xl border bg-card shadow-(--shadow-card) transition-[border-color,box-shadow,transform] outline-none hover:border-foreground/25 focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.99]",
          current && "border-foreground/40 ring-2 ring-foreground/15",
          complete && "border-caught ring-2 ring-caught/30",
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden" style={{ background: game.accent }}>
          <div
            aria-hidden="true"
            className="absolute -right-10 -bottom-12 size-56 rounded-full bg-white/15"
          />
          <div
            aria-hidden="true"
            className="absolute -top-16 -left-10 size-40 rounded-full bg-black/10"
          />
          {card.coverPokemonId ? (
            <PokemonArtwork
              pokemonId={card.coverPokemonId}
              name=""
              size={200}
              sizes="(min-width: 1024px) 200px, 45vw"
              className="absolute inset-0 m-auto size-[78%] drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-3 rounded-md bg-black/45 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-white"
          >
            Ilustração
          </span>
          <span id={statusId} className="sr-only">
            {statusText}
          </span>
          <div
            aria-hidden="true"
            className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5"
          >
            {current && (
              <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold text-foreground">
                Jogando agora
              </span>
            )}
            {partial && (
              <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold text-foreground">
                <Info className="size-3.5" aria-hidden="true" />
                Dados parciais
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <div>
            <h3 id={nameId} className="text-base leading-snug font-bold">
              {game.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {generation} · {vg.regionLabel} · {game.releaseYear}
            </p>
          </div>

          <span id={progressId} className="sr-only">
            {noDex
              ? "Pokédex com cobertura incompleta"
              : ready
                ? `${progress.caught} de ${progress.total} Pokémon, ${progress.percent.toLocaleString("pt-BR")}% concluído${complete ? ", Pokédex completa" : ""}`
                : `${progress.total} Pokémon`}
          </span>
          <div className="mt-auto flex flex-col gap-1.5">
            {noDex ? (
              <p className="text-sm text-muted-foreground">Pokédex com cobertura incompleta</p>
            ) : (
              <>
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {card.defaultDexLabel}
                </p>
                <p className="tabular text-base">
                  <strong className="text-lg">{ready ? progress.caught : "–"}</strong>
                  <span className="text-muted-foreground"> / {progress.total} Pokémon</span>
                </p>
                <div
                  role="progressbar"
                  aria-label={`Progresso em ${game.name}, ${card.defaultDexLabel}`}
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-valuenow={ready ? progress.caught : 0}
                  aria-valuetext={
                    ready ? `${progress.caught} de ${progress.total} obtidos` : "Carregando"
                  }
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-caught transition-[width] duration-500"
                    style={{ width: `${ready ? progress.percent : 0}%` }}
                  />
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {complete ? (
                    <>
                      <CircleCheck className="size-4 text-caught" aria-hidden="true" />
                      <span className="font-semibold text-foreground">Pokédex completa</span>
                    </>
                  ) : (
                    <span className="tabular">
                      {ready ? progress.percent.toLocaleString("pt-BR") : "–"}% concluído
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
});
