"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useCollectionStore } from "@/stores/collection-store";
import { usePreferencesStore } from "@/stores/preferences-store";

/**
 * Loads IndexedDB state once per page load and keeps the theme stored in
 * IndexedDB in sync with next-themes (which owns the no-flash localStorage copy).
 */
export function StoreHydrator() {
  const { setTheme } = useTheme();
  const appliedStoredTheme = useRef(false);
  const prefsHydrated = usePreferencesStore((s) => s.hydrated);
  const prefsRestored = usePreferencesStore((s) => s.restored);
  const storedTheme = usePreferencesStore((s) => s.theme);
  const error = useCollectionStore((s) => s.error);
  const clearError = useCollectionStore((s) => s.clearError);

  useEffect(() => {
    void useCollectionStore.getState().hydrate();
    void usePreferencesStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!prefsHydrated || appliedStoredTheme.current) return;
    appliedStoredTheme.current = true;
    if (prefsRestored) setTheme(storedTheme);
  }, [prefsHydrated, prefsRestored, storedTheme, setTheme]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    clearError();
  }, [error, clearError]);

  return null;
}
