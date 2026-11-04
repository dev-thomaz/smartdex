import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { PokemonArtwork } from "@/components/pokemon/pokemon-artwork";
import { PokeballIcon } from "@/components/pokemon/pokeball-icon";
import { TypeList } from "@/components/pokemon/type-badge";
import { CatchToggle } from "@/features/collection/components/catch-toggle";
import {
  GENERATIONS,
  getGame,
  getVersionGroup,
  mechanicsFor,
  type GameId,
} from "@/features/games/config";
import { getLibraryGame } from "@/features/library/library";
import { getNeighbors, resolveEntry } from "@/features/pokedex/catalog";
import { formatNumber } from "@/features/pokedex/filters";
import { formatHeight, formatWeight } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { PokemonDetail } from "@/types/domain";

import { EncountersPanel } from "./encounters-panel";
import { EvolutionTree, findParent } from "./evolution-tree";
import { MovesPanel } from "./moves-panel";
import { CoverageNote, DetailSection } from "./section";
import { StatsPanel } from "./stats-panel";
import { TypeMatchups } from "./type-matchups";

const SECTIONS = [
  { id: "golpes", label: "Golpes" },
  { id: "evolucao", label: "Evolução" },
  { id: "tipos", label: "Tipos" },
  { id: "atributos", label: "Atributos" },
  { id: "locais", label: "Onde encontrar" },
];

export function PokemonDetailView({ game, detail }: { game: GameId; detail: PokemonDetail }) {
  const config = getGame(game);
  const vg = getVersionGroup(config.versionGroup);
  const mechanics = mechanicsFor(vg.generation);
  const coverage = getLibraryGame(game)?.coverage ?? null;
  const generationLabel = GENERATIONS[vg.generation]?.label ?? `Geração ${vg.generation}`;
  const resolved = resolveEntry(vg.id, detail.slug);
  const entry = resolved?.entry;
  const dexOrder = vg.pokedexes.map((d) => d.id);
  const neighbors = getNeighbors(vg.id, dexOrder, detail.speciesId);
  const parent = findParent(detail.evolution, detail.speciesId);
  const dexBadges = vg.pokedexes.filter((d) => entry?.dex[d.id] !== undefined);

  return (
    <article className="flex flex-col gap-6" aria-labelledby="pokemon-name">
      <nav aria-label="Navegação entre Pokémon" className="flex items-center justify-between gap-2">
        <Link
          href={`/${game}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl pr-3 font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          Pokédex
        </Link>
        <div className="flex gap-2">
          {neighbors.previous && (
            <Link
              href={`/${game}/pokemon/${neighbors.previous.slug}`}
              className="inline-flex h-11 items-center gap-1 rounded-xl border bg-card px-3 text-sm font-semibold hover:bg-accent"
              aria-label={`Anterior: ${neighbors.previous.name}`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="tabular">{formatNumber(neighbors.previous.number)}</span>
              <span className="hidden max-w-28 truncate sm:inline">{neighbors.previous.name}</span>
            </Link>
          )}
          {neighbors.next && (
            <Link
              href={`/${game}/pokemon/${neighbors.next.slug}`}
              className="inline-flex h-11 items-center gap-1 rounded-xl border bg-card px-3 text-sm font-semibold hover:bg-accent"
              aria-label={`Próximo: ${neighbors.next.name}`}
            >
              <span className="hidden max-w-28 truncate sm:inline">{neighbors.next.name}</span>
              <span className="tabular">{formatNumber(neighbors.next.number)}</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </nav>

      <section className="grid gap-6 rounded-3xl border bg-card p-5 shadow-(--shadow-card) sm:p-8 md:grid-cols-[minmax(0,18rem)_1fr] md:items-center">
        <div className="relative mx-auto grid aspect-square w-full max-w-64 place-items-center">
          <div
            aria-hidden="true"
            className="absolute inset-4 grid place-items-center rounded-full bg-muted"
          >
            {/* Faint watermark: decorative, kept low-contrast so the artwork stays the focus. */}
            <PokeballIcon variant="outline" className="size-[82%] text-foreground opacity-[0.07]" />
          </div>
          <PokemonArtwork
            pokemonId={detail.pokemonId}
            name={detail.formLabel ? `${detail.name} (${detail.formLabel})` : detail.name}
            size={256}
            sizes="256px"
            priority
            className="relative size-full"
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="tabular text-sm font-semibold text-muted-foreground">
              {formatNumber(detail.speciesId)} nacional
              {dexBadges.map((d) => (
                <span key={d.id}>
                  {" "}
                  · {d.shortLabel} {formatNumber(entry?.dex[d.id] ?? 0)}
                </span>
              ))}
            </p>
            <h1 id="pokemon-name" className="text-3xl font-bold sm:text-4xl">
              {detail.name}
            </h1>
            {(detail.formLabel || detail.genus) && (
              <p className="text-muted-foreground">
                {[detail.formLabel, detail.genus].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <TypeList types={detail.types} />
          <div className="flex flex-wrap items-center gap-3">
            <CatchToggle game={game} speciesId={detail.speciesId} name={detail.name} />
            {entry?.availability === "dlc" && (
              <span className="rounded-lg bg-secondary px-2.5 py-1 text-sm font-semibold">
                Conteúdo DLC
              </span>
            )}
            {entry?.availability === "outside-dex" && (
              <span className="rounded-lg bg-secondary px-2.5 py-1 text-sm font-semibold">
                Fora das Pokédex regionais
              </span>
            )}
          </div>

          {entry && entry.forms.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-muted-foreground" id="forms-label">
                Formas neste jogo
              </span>
              <ul aria-labelledby="forms-label" className="flex flex-wrap gap-2">
                {entry.forms.map((form) => {
                  const active = form.id === detail.pokemonId;
                  return (
                    <li key={form.id}>
                      <Link
                        href={`/${game}/pokemon/${form.slug}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "bg-background hover:bg-accent",
                        )}
                      >
                        {form.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <div className="rounded-2xl bg-muted/60 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Altura</dt>
              <dd className="tabular font-bold">{formatHeight(detail.heightDm)}</dd>
            </div>
            <div className="rounded-2xl bg-muted/60 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Peso</dt>
              <dd className="tabular font-bold">{formatWeight(detail.weightHg)}</dd>
            </div>
            {mechanics.abilities && (
              <div className="col-span-2 rounded-2xl bg-muted/60 px-4 py-3 xl:col-span-1">
                <dt className="text-sm text-muted-foreground">Habilidades</dt>
                <dd className="font-bold">
                  {detail.abilities.map((a) => a.name + (a.hidden ? " (oculta)" : "")).join(", ")}
                </dd>
              </div>
            )}
          </dl>

          {detail.flavorText && (
            <blockquote className="border-l-4 border-border pl-4 text-pretty">
              <p>{detail.flavorText}</p>
              <footer className="mt-1 text-sm text-muted-foreground">
                Pokédex de {config.name}
              </footer>
            </blockquote>
          )}
        </div>
      </section>

      <nav
        aria-label="Seções"
        className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 [scrollbar-width:none] overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10"
      >
        <ul className="flex gap-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex h-10 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-semibold whitespace-nowrap hover:bg-accent"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <DetailSection
        id="golpes"
        title="Golpes"
        description={`Apenas golpes de ${config.name}, com os valores da ${generationLabel}.`}
      >
        {coverage?.machines === "partial" && (
          <CoverageNote>
            A PokéAPI não informa o número de várias máquinas deste jogo; esses golpes aparecem como
            “Máquinas” sem número.
          </CoverageNote>
        )}
        <MovesPanel
          moves={detail.moves}
          gameName={config.name}
          unavailable={coverage?.learnsets === "missing"}
        />
      </DetailSection>

      <DetailSection
        id="evolucao"
        title="Evolução"
        description={`Condições para ${config.name}, segundo a PokéAPI.`}
      >
        {coverage?.evolutions === "inherited" && (
          <CoverageNote>
            A PokéAPI não tem registros de evolução próprios de {config.name}. As condições vêm do
            registro mais recente de um jogo anterior (indicado abaixo de cada uma) e podem diferir
            neste jogo.
          </CoverageNote>
        )}
        <EvolutionTree root={detail.evolution} game={game} currentId={detail.speciesId} />
      </DetailSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection id="tipos" title="Fraquezas e resistências">
          <TypeMatchups types={detail.types} generation={vg.generation} />
        </DetailSection>
        <DetailSection id="atributos" title="Atributos base">
          {!mechanics.splitSpecialStat && (
            <CoverageNote>
              Na Geração I havia um único atributo “Special”. A PokéAPI só fornece Ataque e Defesa
              Especiais, então esses dois valores são os das gerações seguintes.
            </CoverageNote>
          )}
          <StatsPanel stats={detail.stats} />
        </DetailSection>
      </div>

      <DetailSection
        id="locais"
        title="Onde encontrar"
        description={`Em ${config.name}${vg.pokedexes.some((d) => d.kind === "dlc") ? ", incluindo DLCs" : ""}.`}
      >
        <EncountersPanel
          encounters={detail.encounters}
          gameName={config.name}
          availability={entry?.availability ?? "regional"}
          preEvolution={parent?.name ?? null}
          siblingGames={detail.encountersInSiblingGames}
          unavailable={coverage?.encounters === "missing"}
          partial={coverage?.encounters === "partial"}
        />
      </DetailSection>
    </article>
  );
}
