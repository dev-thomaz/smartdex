"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/layout/logo";
import { readLastGameSync, usePreferencesStore } from "@/stores/preferences-store";

import type { LibraryCardData } from "../library";
import { GameLibrary } from "./game-library";

export function HomeEntry({ cards }: { cards: LibraryCardData[] }) {
  const router = useRouter();
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fast = readLastGameSync();
    if (fast) {
      router.replace(`/${fast}`);
      return;
    }
    void usePreferencesStore
      .getState()
      .hydrate()
      .then(() => {
        if (cancelled) return;
        const stored = usePreferencesStore.getState().lastGame;
        if (stored) router.replace(`/${stored}`);
        else setShowLibrary(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (showLibrary) return <GameLibrary cards={cards} />;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4" aria-busy="true">
      <Logo />
      <p className="text-muted-foreground" role="status">
        Abrindo sua Pokédex…
      </p>
    </main>
  );
}
