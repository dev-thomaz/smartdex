"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { memo } from "react";

import { PokemonArtwork } from "@/components/pokemon/pokemon-artwork";
import { TypeList } from "@/components/pokemon/type-badge";
import type { GameId } from "@/features/games/config";
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
  return (
    <li
      className={cn(
        "group relative rounded-2xl border bg-card shadow-(--shadow-card) transition-[border-color,box-shadow] [contain-intrinsic-size:auto_232px] [content-visibility:auto] hover:border-foreground/20",
        caught && "border-caught/60 ring-1 ring-caught/40",
      )}
    >
      <Link
        href={`/${game}/pokemon/${entry.slug}`}
        className="flex h-full flex-col items-center gap-2 rounded-2xl px-3 pt-3 pb-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <span className="tabular self-start text-sm font-semibold text-muted-foreground">
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
        <span
          aria-hidden="true"
          className={cn(
            "grid size-8 place-items-center rounded-full border-2 transition-all duration-150",
            caught
              ? "scale-100 border-caught bg-caught text-caught-foreground"
              : "border-border bg-card text-muted-foreground group-hover:border-foreground/30 hover:text-foreground",
          )}
        >
          {caught ? (
            <Check className="size-4" strokeWidth={3} />
          ) : (
            <Plus className="size-4" strokeWidth={2.5} />
          )}
        </span>
      </button>
    </li>
  );
});
