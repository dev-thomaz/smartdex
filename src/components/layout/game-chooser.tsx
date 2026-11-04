"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GAMES, type GameId } from "@/features/games/config";
import { readLastGameSync, usePreferencesStore } from "@/stores/preferences-store";

import { GameDot } from "./game-switcher";
import { Logo } from "./logo";

export function GameChooser() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const setLastGame = usePreferencesStore((s) => s.setLastGame);

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
        else setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-8 px-4 py-10">
      <Logo className="self-center" />
      <div aria-live="polite" className="flex flex-col gap-6">
        {checking ? (
          <p className="text-center text-muted-foreground">Abrindo sua Pokédex…</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-bold">Qual jogo você está jogando?</h1>
              <p className="text-muted-foreground">
                Tudo no SmartDex se adapta a ele. Você pode trocar quando quiser.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {(Object.keys(GAMES) as GameId[]).map((id) => (
                <li key={id}>
                  <Link
                    href={`/${id}`}
                    onClick={() => setLastGame(id)}
                    className="flex min-h-16 items-center gap-4 rounded-2xl border bg-card px-5 shadow-(--shadow-card) transition-colors hover:border-foreground/30"
                  >
                    <GameDot game={id} className="size-4" />
                    <span className="flex-1">
                      <span className="block text-lg font-bold">{GAMES[id].name}</span>
                      <span className="text-sm text-muted-foreground">{GAMES[id].family}</span>
                    </span>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
