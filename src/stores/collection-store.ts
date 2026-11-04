"use client";

import { create } from "zustand";

import type { BackupCollection } from "@/features/collection/backup";
import { isGameId, type GameId } from "@/features/games/config";
import { readAllCollections, writeCollection, writeCollections } from "@/lib/storage/db";

export type HydrationStatus = "idle" | "loading" | "ready" | "error";

const EMPTY: ReadonlySet<number> = new Set();

let hydration: Promise<void> | null = null;

interface CollectionState {
  status: HydrationStatus;
  /** Last persistence error, shown to the user. */
  error: string | null;
  caught: Partial<Record<GameId, ReadonlySet<number>>>;
  updatedAt: Partial<Record<GameId, string>>;
  hydrate: () => Promise<void>;
  setCaught: (game: GameId, speciesId: number, caught: boolean) => Promise<void>;
  toggle: (game: GameId, speciesId: number) => Promise<void>;
  importCollections: (
    collections: Partial<Record<GameId, BackupCollection>>,
    mode: "merge" | "replace",
  ) => Promise<void>;
  snapshot: () => Partial<Record<GameId, BackupCollection>>;
  clearError: () => void;
}

function persistError(error: unknown): string {
  console.error(error);
  return "Não foi possível salvar no armazenamento local do navegador.";
}

export const useCollectionStore = create<CollectionState>()((set, get) => ({
  status: "idle",
  error: null,
  caught: {},
  updatedAt: {},

  hydrate() {
    hydration ??= (async () => {
      set({ status: "loading" });
      try {
        const stored = await readAllCollections();
        const caught: CollectionState["caught"] = {};
        const updatedAt: CollectionState["updatedAt"] = {};
        for (const item of stored) {
          if (!isGameId(item.gameId)) continue;
          caught[item.gameId] = new Set(item.caught);
          updatedAt[item.gameId] = item.updatedAt;
        }
        set({ status: "ready", caught, updatedAt });
      } catch (error) {
        console.error(error);
        set({
          status: "error",
          error: "O armazenamento local não está disponível. Seu progresso não será salvo.",
        });
      }
    })();
    return hydration;
  },

  async setCaught(game, speciesId, isCaught) {
    // Never write before stored data is loaded, or we would overwrite it.
    await get().hydrate();
    const current = get().caught[game] ?? EMPTY;
    if (current.has(speciesId) === isCaught) return;
    const next = new Set(current);
    if (isCaught) next.add(speciesId);
    else next.delete(speciesId);
    const updatedAt = new Date().toISOString();
    set((state) => ({
      caught: { ...state.caught, [game]: next },
      updatedAt: { ...state.updatedAt, [game]: updatedAt },
    }));
    try {
      await writeCollection({ gameId: game, caught: [...next], updatedAt });
    } catch (error) {
      set({ error: persistError(error) });
    }
  },

  async toggle(game, speciesId) {
    await get().hydrate();
    const isCaught = (get().caught[game] ?? EMPTY).has(speciesId);
    await get().setCaught(game, speciesId, !isCaught);
  },

  async importCollections(collections, mode) {
    await get().hydrate();
    const now = new Date().toISOString();
    const nextCaught = { ...get().caught };
    const nextUpdated = { ...get().updatedAt };
    const toWrite: { gameId: GameId; caught: number[]; updatedAt: string }[] = [];
    for (const [gameId, incoming] of Object.entries(collections)) {
      if (!isGameId(gameId) || !incoming) continue;
      const base = mode === "merge" ? (nextCaught[gameId] ?? EMPTY) : EMPTY;
      const merged = new Set([...base, ...incoming.caught]);
      nextCaught[gameId] = merged;
      nextUpdated[gameId] = now;
      toWrite.push({ gameId, caught: [...merged], updatedAt: now });
    }
    set({ caught: nextCaught, updatedAt: nextUpdated });
    try {
      await writeCollections(toWrite);
    } catch (error) {
      set({ error: persistError(error) });
      throw error;
    }
  },

  snapshot() {
    const { caught, updatedAt } = get();
    const result: Partial<Record<GameId, BackupCollection>> = {};
    for (const [gameId, set] of Object.entries(caught)) {
      if (!isGameId(gameId) || !set) continue;
      result[gameId] = {
        caught: [...set],
        updatedAt: updatedAt[gameId] ?? new Date().toISOString(),
      };
    }
    return result;
  },

  clearError() {
    set({ error: null });
  },
}));

export function useCaughtSet(game: GameId): ReadonlySet<number> {
  return useCollectionStore((state) => state.caught[game] ?? EMPTY);
}

export function useIsCaught(game: GameId, speciesId: number): boolean {
  return useCollectionStore((state) => (state.caught[game] ?? EMPTY).has(speciesId));
}

/** Test helper: reset in-memory state and forget the hydration promise. */
export function resetCollectionStore(): void {
  hydration = null;
  useCollectionStore.setState({ status: "idle", error: null, caught: {}, updatedAt: {} });
}
