"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import type { GameId } from "@/features/games/config";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

import { GameSwitcher } from "./game-switcher";
import { LogoMark } from "./logo";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function MobileHeader({ game }: { game: GameId }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
      <div className="flex h-16 items-center gap-2 px-4">
        <Link href={`/${game}`} aria-label="SmartDex — voltar à Pokédex" className="rounded-lg">
          <LogoMark />
        </Link>
        <GameSwitcher game={game} className="min-w-0 flex-1" />
        <ThemeToggle />
      </div>
    </header>
  );
}

const itemClass =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition-colors";

export function BottomNav({ game }: { game: GameId }) {
  const pathname = usePathname();
  const router = useRouter();
  const requestSearchFocus = useUiStore((s) => s.requestSearchFocus);
  const [pokedex, ...rest] = NAV_ITEMS;

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const active = item.isActive(pathname, game);
    const Icon = item.icon;
    return (
      <li key={item.label} className="flex flex-1">
        <Link
          href={item.href(game)}
          aria-current={active ? "page" : undefined}
          className={cn(itemClass, active ? "text-primary" : "text-muted-foreground")}
        >
          <Icon className="size-6" aria-hidden="true" />
          {item.label}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg gap-1 px-2 py-1">
        {renderItem(pokedex)}
        <li className="flex flex-1">
          <button
            type="button"
            className={cn(itemClass, "text-muted-foreground")}
            onClick={() => {
              requestSearchFocus();
              if (pathname !== `/${game}`) router.push(`/${game}`);
            }}
          >
            <Search className="size-6" aria-hidden="true" />
            Buscar
          </button>
        </li>
        {rest.map(renderItem)}
      </ul>
    </nav>
  );
}
