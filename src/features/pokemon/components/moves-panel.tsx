"use client";

import { Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { TypeBadge } from "@/components/pokemon/type-badge";
import { normalizeSearch } from "@/features/pokedex/filters";
import { CATEGORY_LABELS, LEARN_METHOD_LABELS, prettifySlug, TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { LearnedMove, MoveCategory } from "@/types/domain";

interface MoveTab {
  id: string;
  label: string;
  /** Header for the first column (level, machine...). */
  column: string | null;
  moves: LearnedMove[];
}

/** Groups a learnset into tabs; machines are split per kind (TM, TR...). */
export function buildMoveTabs(moves: LearnedMove[]): MoveTab[] {
  const tabs: MoveTab[] = [];
  const add = (id: string, label: string, column: string | null, list: LearnedMove[]) => {
    if (list.length > 0) tabs.push({ id, label, column, moves: list });
  };
  add(
    "level-up",
    LEARN_METHOD_LABELS["level-up"],
    "Nível",
    moves.filter((m) => m.method === "level-up"),
  );
  const machines = moves.filter((m) => m.method === "machine");
  const kinds = [...new Set(machines.map((m) => m.machineKind ?? ""))].sort();
  for (const kind of kinds) {
    const list = machines.filter((m) => (m.machineKind ?? "") === kind);
    add(`machine-${kind || "other"}`, kind || LEARN_METHOD_LABELS.machine, kind || "Máquina", list);
  }
  add(
    "egg",
    LEARN_METHOD_LABELS.egg,
    null,
    moves.filter((m) => m.method === "egg"),
  );
  add(
    "tutor",
    LEARN_METHOD_LABELS.tutor,
    null,
    moves.filter((m) => m.method === "tutor"),
  );
  add(
    "other",
    LEARN_METHOD_LABELS.other,
    "Método",
    moves.filter((m) => m.method === "other"),
  );
  return tabs;
}

function firstColumn(move: LearnedMove): string {
  if (move.method === "level-up") return move.level === 0 ? "Evo." : String(move.level ?? "—");
  if (move.method === "machine") return move.machine ?? "—";
  if (move.method === "other") return prettifySlug(move.rawMethod);
  return "";
}

const CATEGORY_DOT: Record<MoveCategory, string> = {
  physical: "bg-[oklch(0.62_0.17_40)]",
  special: "bg-[oklch(0.58_0.14_255)]",
  status: "bg-muted-foreground",
};

function Category({ category }: { category: MoveCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden="true" className={cn("size-2.5 rounded-full", CATEGORY_DOT[category])} />
      {CATEGORY_LABELS[category]}
    </span>
  );
}

const dash = (value: number | null, suffix = "") => (value === null ? "—" : `${value}${suffix}`);

function matches(move: LearnedMove, query: string): boolean {
  if (!query) return true;
  return (
    normalizeSearch(move.move.name).includes(query) ||
    normalizeSearch(TYPE_LABELS[move.move.type]).includes(query) ||
    normalizeSearch(move.machine ?? "") === query
  );
}

export function MovesPanel({
  moves,
  gameName,
  unavailable = false,
}: {
  moves: LearnedMove[];
  gameName: string;
  /** The game has no learnset data at all in PokéAPI. */
  unavailable?: boolean;
}) {
  const tabs = useMemo(() => buildMoveTabs(moves), [moves]);
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const deferred = normalizeSearch(useDeferredValue(query));

  if (tabs.length === 0) {
    return (
      <p className="text-muted-foreground">
        {unavailable
          ? `A PokéAPI ainda não tem os golpes de ${gameName}. Eles aparecerão aqui quando estiverem disponíveis.`
          : `A PokéAPI não lista golpes desta forma em ${gameName}.`}
      </p>
    );
  }

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const filtered = active.moves.filter((m) => matches(m, deferred));

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <label htmlFor="move-search" className="sr-only">
          Buscar golpe por nome, tipo ou máquina
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="move-search"
          type="search"
          autoComplete="off"
          placeholder="Buscar golpe, tipo ou TM/TR"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full rounded-xl border border-input bg-background pr-11 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca de golpes"
            className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Forma de aprendizado"
        className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active.id;
          const count = deferred
            ? tab.moves.filter((m) => matches(m, deferred)).length
            : tab.moves.length;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="moves-tabpanel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(e) => {
                const index = tabs.findIndex((t) => t.id === tab.id);
                const next =
                  e.key === "ArrowRight"
                    ? tabs[(index + 1) % tabs.length]
                    : e.key === "ArrowLeft"
                      ? tabs[(index - 1 + tabs.length) % tabs.length]
                      : null;
                if (next) {
                  e.preventDefault();
                  setActiveId(next.id);
                  document.getElementById(`tab-${next.id}`)?.focus();
                }
              }}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {tab.label}
              <span
                className={cn("tabular text-xs", selected ? "opacity-80" : "text-muted-foreground")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div id="moves-tabpanel" role="tabpanel" aria-labelledby={`tab-${active.id}`}>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">
            Nenhum golpe encontrado nesta aba.
          </p>
        ) : (
          <>
            {/* Desktop / tablet: semantic table */}
            <table className="hidden w-full text-left sm:table">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  {active.column && (
                    <th scope="col" className="w-20 py-2 pr-3 font-semibold">
                      {active.column}
                    </th>
                  )}
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Golpe
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Tipo
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Categoria
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">
                    Poder
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">
                    Precisão
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    PP
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr
                    key={`${m.move.id}-${m.rawMethod}-${m.level}`}
                    className="border-b border-border/60 last:border-0"
                  >
                    {active.column && (
                      <td className="tabular py-2.5 pr-3 font-semibold text-muted-foreground">
                        {firstColumn(m)}
                      </td>
                    )}
                    <th scope="row" className="py-2.5 pr-3 font-bold">
                      {m.move.name}
                    </th>
                    <td className="py-2.5 pr-3">
                      <TypeBadge type={m.move.type} size="sm" />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Category category={m.move.category} />
                    </td>
                    <td className="tabular py-2.5 pr-3 text-right">{dash(m.move.power)}</td>
                    <td className="tabular py-2.5 pr-3 text-right">{dash(m.move.accuracy, "%")}</td>
                    <td className="tabular py-2.5 text-right">{dash(m.move.pp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile: stacked rows, nothing hidden */}
            <ul className="flex flex-col sm:hidden">
              {filtered.map((m) => (
                <li
                  key={`${m.move.id}-${m.rawMethod}-${m.level}`}
                  className="flex flex-col gap-1.5 border-b border-border/60 py-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {active.column && (
                      <span className="tabular w-12 shrink-0 text-sm font-semibold text-muted-foreground">
                        {firstColumn(m)}
                      </span>
                    )}
                    <span className="flex-1 font-bold">{m.move.name}</span>
                    <TypeBadge type={m.move.type} size="sm" />
                  </div>
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground",
                      active.column && "pl-15",
                    )}
                  >
                    <Category category={m.move.category} />
                    <span>
                      Poder{" "}
                      <strong className="tabular text-foreground">{dash(m.move.power)}</strong>
                    </span>
                    <span>
                      Prec.{" "}
                      <strong className="tabular text-foreground">
                        {dash(m.move.accuracy, "%")}
                      </strong>
                    </span>
                    <span>
                      PP <strong className="tabular text-foreground">{dash(m.move.pp)}</strong>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
