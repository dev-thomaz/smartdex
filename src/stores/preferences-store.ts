"use client";

import { z } from "zod";
import { create } from "zustand";

import { getGameVersionGroup, isGameId, type GameId } from "@/features/games/config";
import { defaultView, pokedexViewSchema, type PokedexView } from "@/features/pokedex/filters";
import { readPreference, writePreference } from "@/lib/storage/db";

export const PREFERENCES_KEY = "app";
export const PREFERENCES_SCHEMA_VERSION = 1;
/** Mirrors the last game synchronously so `/` can redirect without waiting for IndexedDB. */
export const LAST_GAME_STORAGE_KEY = "smartdex:last-game";

export const themeSchema = z.enum(["light", "dark", "system"]);
export type ThemePreference = z.infer<typeof themeSchema>;

const storedPreferencesSchema = z.object({
  schemaVersion: z.literal(1),
  lastGame: z.string().nullable(),
  theme: themeSchema,
  views: z.record(z.string(), pokedexViewSchema),
});

type StoredPreferences = z.infer<typeof storedPreferencesSchema>;

interface PreferencesState {
  hydrated: boolean;
  /** True when preferences were found in IndexedDB (not defaults). */
  restored: boolean;
  lastGame: GameId | null;
  theme: ThemePreference;
  views: Partial<Record<GameId, PokedexView>>;
  /** Search text per game. Kept in memory for back/forward, not persisted. */
  queries: Partial<Record<GameId, string>>;
  hydrate: () => Promise<void>;
  setLastGame: (game: GameId) => void;
  setTheme: (theme: ThemePreference) => void;
  updateView: (game: GameId, patch: Partial<PokedexView>) => void;
  resetView: (game: GameId) => void;
  setQuery: (game: GameId, query: string) => void;
}

let hydration: Promise<void> | null = null;

export function defaultViewFor(game: GameId): PokedexView {
  const vg = getGameVersionGroup(game);
  const base = vg.pokedexes.find((d) => d.kind === "base") ?? vg.pokedexes[0];
  return defaultView(base.id);
}

function toStored(state: PreferencesState): StoredPreferences {
  const views: StoredPreferences["views"] = {};
  for (const [game, view] of Object.entries(state.views)) {
    if (view) views[game] = view;
  }
  return {
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    lastGame: state.lastGame,
    theme: state.theme,
    views,
  };
}

function persist(state: PreferencesState) {
  writePreference(PREFERENCES_KEY, toStored(state)).catch((error: unknown) => {
    console.error("Failed to persist preferences", error);
  });
}

function rememberLastGame(game: GameId) {
  try {
    localStorage.setItem(LAST_GAME_STORAGE_KEY, game);
  } catch {
    // Storage may be blocked (private mode); IndexedDB still has it.
  }
}

export const usePreferencesStore = create<PreferencesState>()((set, get) => ({
  hydrated: false,
  restored: false,
  lastGame: null,
  theme: "system",
  views: {},
  queries: {},

  hydrate() {
    hydration ??= (async () => {
      try {
        const raw = await readPreference<unknown>(PREFERENCES_KEY);
        const parsed = storedPreferencesSchema.safeParse(raw);
        if (parsed.success) {
          const views: PreferencesState["views"] = {};
          for (const [game, view] of Object.entries(parsed.data.views)) {
            if (isGameId(game)) views[game] = view;
          }
          set((state) => ({
            restored: true,
            // Values set during this session win over stored ones.
            lastGame:
              state.lastGame ?? (isGameId(parsed.data.lastGame) ? parsed.data.lastGame : null),
            theme: parsed.data.theme,
            views: { ...views, ...state.views },
          }));
        }
      } catch (error) {
        console.error("Failed to read preferences", error);
      } finally {
        set({ hydrated: true });
      }
    })();
    return hydration;
  },

  setLastGame(game) {
    if (get().lastGame === game) return;
    set({ lastGame: game });
    rememberLastGame(game);
    void get()
      .hydrate()
      .then(() => persist(get()));
  },

  setTheme(theme) {
    set({ theme });
    void get()
      .hydrate()
      .then(() => persist(get()));
  },

  updateView(game, patch) {
    const current = get().views[game] ?? defaultViewFor(game);
    set((state) => ({ views: { ...state.views, [game]: { ...current, ...patch } } }));
    void get()
      .hydrate()
      .then(() => persist(get()));
  },

  resetView(game) {
    set((state) => ({
      views: { ...state.views, [game]: defaultViewFor(game) },
      queries: { ...state.queries, [game]: "" },
    }));
    void get()
      .hydrate()
      .then(() => persist(get()));
  },

  setQuery(game, query) {
    set((state) => ({ queries: { ...state.queries, [game]: query } }));
  },
}));

export function readLastGameSync(): GameId | null {
  try {
    const value = localStorage.getItem(LAST_GAME_STORAGE_KEY);
    return isGameId(value) ? value : null;
  } catch {
    return null;
  }
}
