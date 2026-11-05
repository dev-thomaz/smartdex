"use client";

import { ArrowDown01, ArrowDownAZ, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { TypeBadge } from "@/components/pokemon/type-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { GameId, GamePokedex } from "@/features/games/config";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { TYPE_NAMES, type TypeName } from "@/types/domain";

import {
  ALL_DEX,
  MAX_TYPE_FILTERS,
  toggleType,
  type PokedexView,
  type SortOrder,
  type StatusFilter,
  type VersionFilter,
} from "../filters";

const chipBase =
  "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring";
const chipIdle = "border-border bg-card text-foreground hover:bg-accent";
const chipActive = "border-foreground bg-foreground text-background";

export function SearchField({
  game,
  value,
  onChange,
}: {
  game: GameId;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nonce = useUiStore((s) => s.searchFocusNonce);
  const lastNonce = useRef(nonce);

  useEffect(() => {
    if (nonce === lastNonce.current) return;
    lastNonce.current = nonce;
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [nonce]);

  return (
    <div className="relative flex-1">
      <label htmlFor={`search-${game}`} className="sr-only">
        Buscar por nome ou número
      </label>
      <input
        ref={inputRef}
        id={`search-${game}`}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Buscar por nome ou número"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onChange("");
        }}
        className="h-12 w-full rounded-xl border border-input bg-card px-4 pr-11 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function DexTabs({
  dexes,
  sizes,
  showAll,
  value,
  onChange,
}: {
  dexes: GamePokedex[];
  /** Validated species count per dex id. */
  sizes: Record<string, number>;
  /** Show the "all compatible" view (only when it adds species). */
  showAll: boolean;
  value: string;
  onChange: (dex: string) => void;
}) {
  if (dexes.length === 1 && !showAll) return null;
  const options = [
    ...dexes.map((d) => ({
      id: d.id,
      label: d.shortLabel,
      dlc: d.kind === "dlc",
      size: sizes[d.id],
    })),
    ...(showAll ? [{ id: ALL_DEX, label: "Todos compatíveis", dlc: false, size: undefined }] : []),
  ];
  return (
    <div
      role="group"
      aria-label="Pokédex"
      className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-0.5"
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(chipBase, "h-10", active ? chipActive : chipIdle)}
          >
            {option.label}
            {option.size !== undefined && (
              <span
                className={cn("tabular text-xs", active ? "opacity-80" : "text-muted-foreground")}
              >
                {option.size}
              </span>
            )}
            {option.dlc && (
              <span
                className={cn(
                  "rounded-md px-1.5 text-[0.7rem] font-bold tracking-wide",
                  active ? "bg-background/20" : "bg-muted text-muted-foreground",
                )}
              >
                DLC
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "missing", label: "Faltando" },
  { value: "caught", label: "Capturados" },
];

export function StatusChips({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Estado de captura" className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(chipBase, active ? chipActive : chipIdle)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface VersionOption {
  value: VersionFilter;
  label: string;
  count?: number;
}

/** "Todas as versões / Só em Sword / Só em Shield" — only shown when exclusives are known. */
export function VersionChips({
  options,
  value,
  onChange,
}: {
  options: VersionOption[];
  value: VersionFilter;
  onChange: (value: VersionFilter) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Exclusivos de versão"
      className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(chipBase, active ? chipActive : chipIdle)}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn("tabular text-xs", active ? "opacity-80" : "text-muted-foreground")}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const SORT_OPTIONS: { value: SortOrder; label: string; icon: typeof ArrowDown01 }[] = [
  { value: "dex", label: "Número", icon: ArrowDown01 },
  { value: "name", label: "Nome (A–Z)", icon: ArrowDownAZ },
];

export function FilterSheet({
  view,
  onChange,
}: {
  view: PokedexView;
  onChange: (patch: Partial<PokedexView>) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const activeCount = view.types.length + (view.sort !== "dex" ? 1 : 0);

  // Close when the page is hidden by navigation (Activity keeps state otherwise).
  useLayoutEffect(() => () => setOpen(false), []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="h-12 gap-2 rounded-xl px-4"
          aria-label={`Filtros e ordenação${activeCount ? `, ${activeCount} ativos` : ""}`}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">Filtros</span>
          {activeCount > 0 && (
            <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 p-0",
          isDesktop
            ? "w-full sm:max-w-md"
            : "max-h-[85dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-lg">Filtros e ordenação</SheetTitle>
          <SheetDescription>As mudanças aparecem na hora.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">
              Tipo{" "}
              <span className="font-normal text-muted-foreground">(até {MAX_TYPE_FILTERS})</span>
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_NAMES.map((type) => {
                const active = view.types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    data-type={type}
                    onClick={() => onChange({ types: toggleType(view.types, type) })}
                    className={cn(
                      "h-11 rounded-xl border-2 text-sm font-bold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
                      active
                        ? "border-(--type-bg) bg-(--type-bg) text-(--type-fg)"
                        : "border-border bg-card text-foreground hover:border-(--type-bg)",
                    )}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">Ordenar por</legend>
            <div role="radiogroup" aria-label="Ordenar por" className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((option) => {
                const active = view.sort === option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ sort: option.value })}
                    className={cn(
                      chipBase,
                      "justify-center rounded-xl",
                      active ? chipActive : chipIdle,
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
        <SheetFooter className="border-t px-5 py-4 sm:flex-row">
          <Button
            variant="ghost"
            className="h-11 rounded-xl"
            onClick={() => onChange({ types: [], sort: "dex" })}
            disabled={activeCount === 0}
          >
            Limpar
          </Button>
          <Button className="h-11 flex-1 rounded-xl" onClick={() => setOpen(false)}>
            Ver resultados
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function ActiveFilters({
  view,
  query,
  versionLabel,
  onRemoveType,
  onClearQuery,
  onClearVersion,
  onReset,
}: {
  view: PokedexView;
  query: string;
  /** Label of the active version filter, if any. */
  versionLabel?: string;
  onClearVersion: () => void;
  onRemoveType: (type: TypeName) => void;
  onClearQuery: () => void;
  onReset: () => void;
}) {
  const hasAny =
    view.types.length > 0 ||
    query.trim() !== "" ||
    view.sort !== "dex" ||
    view.status !== "all" ||
    view.version !== "all";
  if (!hasAny) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
      {query.trim() && (
        <button
          type="button"
          onClick={onClearQuery}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-semibold"
          aria-label={`Remover busca "${query}"`}
        >
          “{query.trim()}” <X className="size-4" aria-hidden="true" />
        </button>
      )}
      {view.types.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onRemoveType(type)}
          className="inline-flex items-center gap-1 rounded-full"
          aria-label={`Remover filtro de tipo ${TYPE_LABELS[type]}`}
        >
          <TypeBadge type={type} className="h-9" />
          <X className="-ml-0.5 size-4 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
      {versionLabel && (
        <button
          type="button"
          onClick={onClearVersion}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-semibold"
          aria-label={`Remover filtro ${versionLabel}`}
        >
          {versionLabel} <X className="size-4" aria-hidden="true" />
        </button>
      )}
      {view.sort === "name" && (
        <span className="inline-flex h-9 items-center rounded-full bg-secondary px-3 text-sm font-semibold">
          Ordem A–Z
        </span>
      )}
      <Button variant="link" className="h-9 px-2 text-sm" onClick={onReset}>
        Limpar tudo
      </Button>
    </div>
  );
}
