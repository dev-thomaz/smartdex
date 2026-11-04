import { ChartPie, Gamepad2, LayoutGrid, Settings, type LucideIcon } from "lucide-react";

import type { GameId } from "@/features/games/config";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href: (game: GameId) => string;
  isActive: (pathname: string, game: GameId) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Pokédex",
    icon: LayoutGrid,
    href: (game) => `/${game}`,
    isActive: (pathname, game) =>
      pathname === `/${game}` || pathname.startsWith(`/${game}/pokemon`),
  },
  {
    label: "Jogos",
    icon: Gamepad2,
    href: () => "/jogos",
    isActive: (pathname) => pathname.startsWith("/jogos"),
  },
  {
    label: "Progresso",
    icon: ChartPie,
    href: (game) => `/${game}/progresso`,
    isActive: (pathname, game) => pathname.startsWith(`/${game}/progresso`),
  },
  {
    label: "Ajustes",
    icon: Settings,
    href: (game) => `/${game}/ajustes`,
    isActive: (pathname, game) => pathname.startsWith(`/${game}/ajustes`),
  },
];
