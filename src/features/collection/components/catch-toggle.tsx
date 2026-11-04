"use client";

import { Plus } from "lucide-react";

import { PokeballIcon } from "@/components/pokemon/pokeball-icon";

import { Button } from "@/components/ui/button";
import type { GameId } from "@/features/games/config";
import { GAMES } from "@/features/games/config";
import { cn } from "@/lib/utils";
import { useCollectionStore, useIsCaught } from "@/stores/collection-store";

export function CatchToggle({
  game,
  speciesId,
  name,
}: {
  game: GameId;
  speciesId: number;
  name: string;
}) {
  const caught = useIsCaught(game, speciesId);
  const toggle = useCollectionStore((s) => s.toggle);
  return (
    <Button
      type="button"
      onClick={() => void toggle(game, speciesId)}
      aria-pressed={caught}
      aria-label={
        caught
          ? `${name} capturado em ${GAMES[game].name}. Desmarcar`
          : `Marcar ${name} como capturado em ${GAMES[game].name}`
      }
      variant="outline"
      className={cn(
        "h-12 gap-2 rounded-xl px-5 text-base font-bold",
        caught && "border-foreground/40 bg-accent hover:bg-accent/80",
      )}
    >
      {caught ? (
        <PokeballIcon className="size-6" />
      ) : (
        <Plus className="size-5" aria-hidden="true" />
      )}
      {caught ? "Capturado" : "Marcar como capturado"}
    </Button>
  );
}
