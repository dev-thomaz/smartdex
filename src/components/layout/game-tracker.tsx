"use client";

import { useEffect } from "react";

import type { GameId } from "@/features/games/config";
import { usePreferencesStore } from "@/stores/preferences-store";

/** Remembers the game being browsed so `/` reopens it next time. */
export function GameTracker({ game }: { game: GameId }) {
  const setLastGame = usePreferencesStore((s) => s.setLastGame);
  useEffect(() => setLastGame(game), [game, setLastGame]);
  return null;
}
