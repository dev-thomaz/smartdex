"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { GameId } from "@/features/games/config";
import { cn } from "@/lib/utils";

import { GameSwitcher } from "./game-switcher";
import { GlobalSearch } from "./global-search";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar({ game }: { game: GameId }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r bg-surface px-4 py-5 lg:flex">
      <div className="flex items-center justify-between px-1">
        <Link href={`/${game}`} className="rounded-lg" aria-label="SmartDex — voltar à Pokédex">
          <Logo />
        </Link>
        <ThemeToggle className="size-10 rounded-xl" />
      </div>
      <div className="flex flex-col gap-3">
        <GameSwitcher game={game} className="w-full" />
        <GlobalSearch />
      </div>
      <nav aria-label="Principal">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname, game);
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href(game)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-xl px-3 font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    active && "bg-card text-foreground shadow-(--shadow-card)",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="mt-auto px-1 text-xs leading-relaxed text-muted-foreground">
        Dados: PokéAPI. Projeto de fãs, sem afiliação com Nintendo, Game Freak ou The Pokémon
        Company.
      </p>
    </aside>
  );
}
