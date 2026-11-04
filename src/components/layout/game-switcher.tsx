"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GAMES, getGamesByFamily, PLANNED_GAMES, type GameId } from "@/features/games/config";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/stores/preferences-store";

/** Same page in another game: `/sword/pokemon/eevee` → `/shield/pokemon/eevee`. */
export function pathForGame(pathname: string, game: GameId): string {
  const rest = pathname.split("/").slice(2).join("/");
  return rest ? `/${game}/${rest}` : `/${game}`;
}

export function GameDot({ game, className }: { game: GameId; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ background: GAMES[game].accent }}
    />
  );
}

export function GameSwitcher({ game, className }: { game: GameId; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const setLastGame = usePreferencesStore((s) => s.setLastGame);
  const current = GAMES[game];

  function select(next: GameId) {
    if (next === game) return;
    setLastGame(next);
    router.push(pathForGame(pathname, next));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-11 justify-between gap-2 rounded-xl px-3 text-left", className)}
          aria-label={`Jogo selecionado: ${current.name}. Trocar jogo`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <GameDot game={game} />
            <span className="truncate font-semibold">{current.name}</span>
          </span>
          <ChevronsUpDown className="size-4 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {getGamesByFamily().map(({ family, games }) => (
          <DropdownMenuGroup key={family}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {family}
            </DropdownMenuLabel>
            {games.map((g) => (
              <DropdownMenuItem
                key={g.id}
                onSelect={() => select(g.id)}
                className="min-h-11 gap-2.5"
              >
                <GameDot game={g.id} />
                <span className="flex-1 font-medium">{g.name}</span>
                {g.id === game && <Check className="size-4" aria-label="selecionado" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Em breve</DropdownMenuLabel>
        {PLANNED_GAMES.map((g) => (
          <DropdownMenuItem key={g.name} disabled className="min-h-10 flex-col items-start gap-0">
            <span>{g.name}</span>
            <span className="text-xs">{g.family}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
