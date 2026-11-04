import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";

import { GAMES, type GameId } from "@/features/games/config";
import { cn } from "@/lib/utils";

export function GameDot({ game, className }: { game: GameId; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ background: GAMES[game].accent }}
    />
  );
}

/** Current game + one-tap access to the game library. */
export function GameSwitcher({ game, className }: { game: GameId; className?: string }) {
  const current = GAMES[game];
  return (
    <Link
      href="/jogos"
      aria-label={`Jogo selecionado: ${current.name}. Trocar de jogo`}
      className={cn(
        "flex h-11 items-center justify-between gap-2 rounded-xl border bg-card px-3 font-semibold transition-colors hover:bg-accent",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <GameDot game={game} />
        <span className="truncate">{current.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeftRight className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Trocar</span>
      </span>
    </Link>
  );
}
