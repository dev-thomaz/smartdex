"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { memo, type CSSProperties } from "react";

import { PokemonArtwork } from "@/components/pokemon/pokemon-artwork";
import { PokeballIcon } from "@/components/pokemon/pokeball-icon";
import { TypeList } from "@/components/pokemon/type-badge";
import { GAMES, isGameId, type GameId } from "@/features/games/config";
import { cn } from "@/lib/utils";

import type { CardEntry } from "../catalog-context";
import { formatNumber } from "../filters";

interface PokemonCardProps {
  game: GameId;
  entry: CardEntry;
  number: number;
  caught: boolean;
  onToggle: (speciesId: number) => void;
  priority?: boolean;
}

export const PokemonCard = memo(function PokemonCard({
  game,
  entry,
  number,
  caught,
  onToggle,
  priority,
}: PokemonCardProps) {
  // Type colors for the caught tint; single-type Pokémon get a flat tint.
  const tint = {
    "--t1": `var(--type-${entry.types[0]})`,
    "--t2": `var(--type-${entry.types[1] ?? entry.types[0]})`,
  } as CSSProperties;
  return (
    <li
      style={caught ? tint : undefined}
      className={cn(
        "group relative rounded-2xl border bg-card shadow-(--shadow-card) transition-[border-color,box-shadow,background] [contain-intrinsic-size:auto_232px] [content-visibility:auto] hover:border-foreground/20",
        caught && "caught-surface",
      )}
    >
      <Link
        href={`/${game}/pokemon/${entry.slug}`}
        className="flex h-full flex-col items-center gap-2 rounded-2xl px-3 pt-3 pb-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <span
          className={cn(
            "tabular self-start text-sm font-semibold",
            caught ? "text-foreground/80" : "text-muted-foreground",
          )}
        >
          {formatNumber(number)}
        </span>
        <PokemonArtwork
          pokemonId={entry.artId}
          name={entry.name}
          size={104}
          sizes="(min-width: 640px) 120px, 104px"
          priority={priority}
          className="size-24 transition-transform duration-200 group-hover:scale-105 sm:size-28"
        />
        <span className="w-full truncate text-center text-base font-bold">{entry.name}</span>
        <TypeList types={entry.types} size="sm" className="justify-center" />
        <ExclusiveTag game={game} exclusiveTo={entry.exclusiveTo} />
      </Link>
      <button
        type="button"
        onClick={() => onToggle(entry.id)}
        aria-pressed={caught}
        aria-label={
          caught ? `Desmarcar ${entry.name} como capturado` : `Marcar ${entry.name} como capturado`
        }
        className="absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        {caught ? (
          <PokeballIcon className="size-8 drop-shadow-sm transition-transform duration-150 motion-safe:animate-in motion-safe:zoom-in-75" />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full border-2 border-border bg-card text-muted-foreground transition-colors duration-150 group-hover:border-foreground/30 hover:text-foreground"
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </span>
        )}
      </button>
    </li>
  );
});

/** "Exclusivo" for the game being played, "Só em X" for a sibling version. Text, not color. */
export function ExclusiveTag({ game, exclusiveTo }: { game: GameId; exclusiveTo?: string }) {
  if (!exclusiveTo || !isGameId(exclusiveTo)) return null;
  const mine = exclusiveTo === game;
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-bold",
        mine
          ? "bg-foreground text-background"
          : "border border-dashed border-foreground/40 text-foreground/80",
      )}
    >
      {mine ? `Exclusivo de ${GAMES[game].shortName}` : `Só em ${GAMES[exclusiveTo].shortName}`}
    </span>
  );
}
