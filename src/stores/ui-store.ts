"use client";

import { create } from "zustand";

/** Ephemeral UI signals shared across distant components. */
interface UiState {
  /** Incremented to ask the Pokédex search field to take focus. */
  searchFocusNonce: number;
  requestSearchFocus: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  searchFocusNonce: 0,
  requestSearchFocus: () => set((s) => ({ searchFocusNonce: s.searchFocusNonce + 1 })),
}));
