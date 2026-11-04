"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { usePreferencesStore, type ThemePreference } from "@/stores/preferences-store";

/** Theme setter that updates next-themes and the IndexedDB preference together. */
export function useThemePreference() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const setStoredTheme = usePreferencesStore((s) => s.setTheme);
  const apply = (value: ThemePreference) => {
    setTheme(value);
    setStoredTheme(value);
  };
  return { theme: (theme ?? "system") as ThemePreference, resolvedTheme, setTheme: apply };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useThemePreference();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className ?? "size-11 rounded-xl"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // Constant label: the resolved theme is unknown during SSR.
      aria-label="Alternar tema claro ou escuro"
    >
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
      <Moon className="size-5 dark:hidden" aria-hidden="true" />
    </Button>
  );
}
