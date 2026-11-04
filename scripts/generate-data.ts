/**
 * Generates the normalized, versioned data catalogs used by SmartDex.
 *
 *   pnpm data:generate
 *
 * Output (committed to the repo, read at build time):
 *   src/data/generated/type-chart.json
 *   src/data/generated/<version-group>/catalog.json
 *   src/data/generated/<version-group>/moves.json
 *
 * Why: listing a whole Pokédex from REST would need hundreds of requests on
 * first render. Instead this script performs a handful of bulk requests
 * (PokéAPI GraphQL + REST pokedex endpoints) and writes compact JSON that the
 * app serves statically. Per-Pokémon details are still fetched at runtime.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GAMES,
  VERSION_GROUPS,
  type GameConfig,
  type VersionGroupConfig,
} from "../src/features/games/config";
import {
  buildTypeChart,
  machineLabel,
  resolveForGeneration,
  resolveMoveCategory,
  resolveMoveValues,
  type TypeEfficacyRow,
} from "../src/lib/api/pokeapi/resolve";
import {
  TYPE_NAMES,
  isTypeName,
  type Availability,
  type CatalogEntry,
  type GameCatalog,
  type MoveCategory,
  type MoveIndex,
  type MoveInfo,
  type CoverageLevel,
  type CoverageMetrics,
  type GameDataCoverage,
  type LibraryFile,
  type LibraryGame,
  type TypeChartFile,
  type TypeName,
  type VersionGroupFile,
} from "../src/types/domain";

const GRAPHQL = "https://graphql.pokeapi.co/v1beta2";
const REST = "https://pokeapi.co/api/v2";
const OUT_DIR = path.join(process.cwd(), "src/data/generated");
const SCHEMA_VERSION = 1;
const ENGLISH = 9;

async function request<T>(url: string, init?: RequestInit, attempt = 1): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    if (attempt < 4 && res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return request<T>(url, init, attempt + 1);
    }
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return (await res.json()) as T;
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const body = await request<{ data?: T; errors?: unknown }>(GRAPHQL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (body.errors || !body.data) {
    throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  }
  return body.data;
}

function asTypes(names: string[]): TypeName[] {
  return names.filter(isTypeName);
}

interface VersionGroupRow {
  id: number;
  name: string;
  order: number;
  generation_id: number;
}

interface TypeRow {
  id: number;
  name: string;
  generation_id: number;
  typeefficacies: { damage_factor: number; target_type_id: number }[];
  typeefficacypasts: { damage_factor: number; target_type_id: number; generation_id: number }[];
}

async function loadReference(): Promise<Reference> {
  return gql<Reference>(`
    query {
      pokemonspecies(order_by: { id: asc }) { id generation_id }
      versiongroup(order_by: { order: asc }) { id name order generation_id }
      type(where: { id: { _lt: 10000 } }) {
        id name generation_id
        typeefficacies { damage_factor target_type_id }
        typeefficacypasts { damage_factor target_type_id generation_id }
      }
    }`);
}

function buildTypeChartFile(types: TypeRow[], generations: number[]): TypeChartFile {
  const byId = new Map(types.map((t) => [t.id, t]));
  const rows: TypeEfficacyRow[] = [];
  for (const attacker of types) {
    if (!isTypeName(attacker.name)) continue;
    for (const eff of attacker.typeefficacies) {
      const defender = byId.get(eff.target_type_id);
      if (!defender || !isTypeName(defender.name)) continue;
      rows.push({
        attacker: attacker.name,
        defender: defender.name,
        factor: eff.damage_factor,
        past: attacker.typeefficacypasts
          .filter((p) => p.target_type_id === eff.target_type_id)
          .map((p) => ({ generation: p.generation_id, factor: p.damage_factor })),
      });
    }
  }
  const byGeneration: TypeChartFile["byGeneration"] = {};
  for (const generation of generations) {
    const valid = TYPE_NAMES.filter((name) => {
      const row = types.find((t) => t.name === name);
      return row !== undefined && row.generation_id <= generation;
    });
    byGeneration[String(generation)] = {
      types: valid,
      chart: buildTypeChart(rows, valid, generation),
    };
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    byGeneration,
  };
}

interface RestPokedex {
  name: string;
  pokemon_entries: { entry_number: number; pokemon_species: { url: string } }[];
}

function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) throw new Error(`Cannot parse id from ${url}`);
  return Number(match[1]);
}

interface PokemonRow {
  id: number;
  name: string;
  is_default: boolean;
  pokemon_species_id: number;
  pokemontypes: { slot: number; type: { name: string } }[];
  pokemontypepasts: { generation_id: number; slot: number; type: { name: string } }[];
  pokemonforms: {
    is_default: boolean;
    form_name: string;
    pokemonformnames: { name: string | null; pokemon_name: string | null }[];
  }[];
  pokemonspecy: {
    name: string;
    is_legendary: boolean;
    is_mythical: boolean;
    pokemonspeciesnames: { name: string }[];
  };
  pokemonmoves_aggregate: { aggregate: { count: number } };
}

function typesForGeneration(row: PokemonRow, generation: number): TypeName[] {
  const current = asTypes(
    [...row.pokemontypes].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
  );
  const pastByGen = new Map<number, TypeName[]>();
  for (const past of [...row.pokemontypepasts].sort((a, b) => a.slot - b.slot)) {
    const list = pastByGen.get(past.generation_id) ?? [];
    if (isTypeName(past.type.name)) list.push(past.type.name);
    pastByGen.set(past.generation_id, list);
  }
  return resolveForGeneration(
    current,
    [...pastByGen.entries()].map(([g, value]) => ({ generation: g, value })),
    generation,
  );
}

function formLabel(row: PokemonRow): string {
  const form = row.pokemonforms.find((f) => f.is_default) ?? row.pokemonforms[0];
  const name = form?.pokemonformnames[0]?.name;
  if (row.is_default) return name || "Forma padrão";
  return name || form?.form_name || row.name;
}

const EXCLUDED_FORM_TAGS = ["gmax", "totem"];

function isListedForm(row: PokemonRow): boolean {
  const parts = row.name.split("-");
  return !EXCLUDED_FORM_TAGS.some((tag) => parts.includes(tag));
}

function isPreferredForm(row: PokemonRow, tag: string | undefined): boolean {
  if (!tag || row.is_default) return false;
  return row.name.split("-").includes(tag) && isListedForm(row);
}

const restCache = new Map<string, Promise<RestPokedex>>();
function fetchDex(name: string): Promise<RestPokedex> {
  let promise = restCache.get(name);
  if (!promise) {
    promise = request<RestPokedex>(`${REST}/pokedex/${name}`);
    restCache.set(name, promise);
  }
  return promise;
}

interface Reference {
  versiongroup: VersionGroupRow[];
  type: TypeRow[];
  pokemonspecies: { id: number; generation_id: number }[];
}

/** speciesId → number shown, per dex id. */
async function buildDexes(vg: VersionGroupConfig, reference: Reference) {
  const result = new Map<string, Map<number, number>>();
  for (const dex of vg.pokedexes) {
    const numbers = new Map<number, number>();
    if (dex.sources === "national") {
      for (const s of reference.pokemonspecies) {
        if (s.generation_id <= (vg.nationalDexGeneration ?? vg.generation)) numbers.set(s.id, s.id);
      }
    } else {
      for (const source of dex.sources) {
        const raw = await fetchDex(source);
        for (const entry of raw.pokemon_entries) {
          const speciesId = idFromUrl(entry.pokemon_species.url);
          if (numbers.has(speciesId)) continue;
          numbers.set(speciesId, dex.numbering === "national" ? speciesId : entry.entry_number);
        }
      }
    }
    result.set(dex.id, numbers);
  }
  return result;
}

function level(ratio: number, completeAt: number, total: number): CoverageLevel {
  if (total === 0 || ratio === 0) return "missing";
  return ratio >= completeAt ? "complete" : "partial";
}

async function buildCatalog(vg: VersionGroupConfig, reference: Reference) {
  const learnsetIds = reference.versiongroup
    .filter((r) => vg.learnsetVersionGroups.includes(r.name))
    .map((r) => r.id);
  const dexes = await buildDexes(vg, reference);
  const dexSpecies = [...new Set([...dexes.values()].flatMap((m) => [...m.keys()]))];

  const { pokemon } = await gql<{ pokemon: PokemonRow[] }>(
    `query ($vgs: [Int!], $species: [Int!]) {
      pokemon(
        where: { _or: [
          { pokemonmoves: { version_group_id: { _in: $vgs } } },
          { pokemon_species_id: { _in: $species }, is_default: { _eq: true } }
        ] },
        order_by: { id: asc }
      ) {
        id name is_default pokemon_species_id
        pokemontypes { slot type { name } }
        pokemontypepasts { generation_id slot type { name } }
        pokemonforms { is_default form_name pokemonformnames(where: { language_id: { _eq: ${ENGLISH} } }) { name pokemon_name } }
        pokemonspecy {
          name is_legendary is_mythical
          pokemonspeciesnames(where: { language_id: { _eq: ${ENGLISH} } }) { name }
        }
        pokemonmoves_aggregate(where: { version_group_id: { _in: $vgs } }) { aggregate { count } }
      }
    }`,
    { vgs: learnsetIds, species: dexSpecies },
  );

  const bySpecies = new Map<number, PokemonRow[]>();
  for (const row of pokemon) {
    const list = bySpecies.get(row.pokemon_species_id) ?? [];
    list.push(row);
    bySpecies.set(row.pokemon_species_id, list);
  }

  const kindOf = new Map(vg.pokedexes.map((d) => [d.id, d.kind]));
  const entries: CatalogEntry[] = [];
  for (const [speciesId, rows] of [...bySpecies.entries()].sort((a, b) => a[0] - b[0])) {
    const dex: Record<string, number> = {};
    for (const [dexId, numbers] of dexes) {
      const n = numbers.get(speciesId);
      if (n !== undefined) dex[dexId] = n;
    }
    const kinds = Object.keys(dex).map((id) => kindOf.get(id));
    const withLearnset = rows.filter((r) => r.pokemonmoves_aggregate.aggregate.count > 0);
    if (kinds.length === 0 && withLearnset.length === 0) continue;

    const availability: Availability = kinds.some((k) => k === "base" || k === "area")
      ? "regional"
      : kinds.includes("dlc")
        ? "dlc"
        : kinds.includes("national")
          ? "national"
          : "outside-dex";

    const formRows = (
      withLearnset.length > 0 ? withLearnset : rows.filter((r) => r.is_default)
    ).filter(isListedForm);
    const display =
      formRows.find((r) => isPreferredForm(r, vg.preferredFormTag)) ??
      formRows.find((r) => r.is_default) ??
      formRows[0] ??
      rows[0];
    const species = display.pokemonspecy;

    entries.push({
      id: speciesId,
      slug: species.name,
      name: species.pokemonspeciesnames[0]?.name ?? species.name,
      types: typesForGeneration(display, vg.generation),
      artId: display.id,
      dex,
      availability,
      hasLearnset: withLearnset.length > 0,
      forms: (formRows.length > 0 ? formRows : [display]).map((r) => ({
        id: r.id,
        slug: r.name,
        label: formLabel(r),
        types: typesForGeneration(r, vg.generation),
      })),
      legendary: species.is_legendary,
      mythical: species.is_mythical,
    });
  }

  const inCatalog = new Set(entries.map((e) => e.id));
  const missing = dexSpecies.filter((id) => !inCatalog.has(id));
  if (missing.length > 0) {
    console.warn(
      `[${vg.id}] ${missing.length} dex species missing from PokéAPI pokemon data:`,
      missing.join(", "),
    );
  }

  const catalog: GameCatalog = {
    schemaVersion: SCHEMA_VERSION,
    versionGroup: vg.id,
    generatedAt: new Date().toISOString(),
    source: "PokéAPI (graphql.pokeapi.co/v1beta2 + pokeapi.co/api/v2/pokedex)",
    dexes: vg.pokedexes.map((d) => ({
      id: d.id,
      size: entries.filter((e) => e.dex[d.id] !== undefined).length,
    })),
    hasOutsideDex: entries.some((e) => e.availability === "outside-dex"),
    entries,
  };
  const dexSet = new Set(dexSpecies);
  const speciesWithLearnset = entries.filter((e) => dexSet.has(e.id) && e.hasLearnset).length;
  return { catalog, dexSpeciesCount: dexSpecies.length, speciesWithLearnset };
}

async function measureGame(
  game: GameConfig,
  vg: VersionGroupConfig,
  dexSpeciesCount: number,
  speciesWithLearnset: number,
  machines: { machineMoves: number; withoutLabel: number; records: number },
) {
  const data = await gql<{
    encounters: { aggregate: { count: number } };
    flavor: { aggregate: { count: number } };
    evolutions: { aggregate: { count: number } };
    cover: { id: number }[];
  }>(
    `query ($versions: [String!], $flavorVersion: String!, $vgs: [String!], $cover: String!) {
      encounters: pokemonspecies_aggregate(where: { pokemons: { encounters: { version: { name: { _in: $versions } } } } }) { aggregate { count } }
      flavor: pokemonspeciesflavortext_aggregate(where: { version: { name: { _eq: $flavorVersion } }, language_id: { _eq: ${ENGLISH} } }) { aggregate { count } }
      evolutions: pokemonevolution_aggregate(where: { versiongroup: { name: { _in: $vgs } } }) { aggregate { count } }
      cover: pokemon(where: { name: { _eq: $cover } }) { id }
    }`,
    {
      versions: game.encounterVersions,
      flavorVersion: game.pokeapiVersion,
      vgs: vg.learnsetVersionGroups,
      cover: game.coverPokemon,
    },
  );
  const metrics: CoverageMetrics = {
    dexSpecies: dexSpeciesCount,
    speciesWithLearnset,
    machineMoves: machines.machineMoves,
    machineMovesWithoutLabel: machines.withoutLabel,
    evolutionRecords: data.evolutions.aggregate.count,
    speciesWithEncounters: data.encounters.aggregate.count,
    flavorTexts: data.flavor.aggregate.count,
  };
  const coverage: GameDataCoverage = {
    pokedex: dexSpeciesCount > 0 ? "complete" : "missing",
    learnsets: level(speciesWithLearnset / Math.max(dexSpeciesCount, 1), 0.98, dexSpeciesCount),
    machines:
      machines.machineMoves === 0 && machines.records === 0
        ? "not-applicable"
        : machines.machineMoves === 0
          ? "missing"
          : machines.withoutLabel === 0
            ? "complete"
            : "partial",
    evolutions: metrics.evolutionRecords > 0 ? "recorded" : "inherited",
    encounters: level(
      metrics.speciesWithEncounters / Math.max(dexSpeciesCount, 1),
      0.3,
      dexSpeciesCount,
    ),
    flavorText: level(metrics.flavorTexts / Math.max(dexSpeciesCount, 1), 0.95, dexSpeciesCount),
  };
  if (data.cover.length === 0)
    console.warn(`[${game.id}] cover Pokémon "${game.coverPokemon}" not found`);
  const result: LibraryGame = { coverPokemonId: data.cover[0]?.id ?? null, coverage, metrics };
  return result;
}

interface MoveRow {
  id: number;
  name: string;
  power: number | null;
  pp: number | null;
  accuracy: number | null;
  type: { name: string } | null;
  movedamageclass: { name: string } | null;
  movenames: { name: string }[];
  movechanges: {
    version_group_id: number;
    power: number | null;
    pp: number | null;
    accuracy: number | null;
    type: { name: string } | null;
  }[];
}

interface MachineRow {
  machine_number: number;
  move_id: number;
  version_group_id: number;
  item: { name: string } | null;
}

async function buildMoveIndex(vg: VersionGroupConfig, vgRows: VersionGroupRow[]) {
  const learnset = vgRows.filter((r) => vg.learnsetVersionGroups.includes(r.name));
  const learnsetIds = learnset.map((r) => r.id);
  const targetOrder = learnset.length ? Math.min(...learnset.map((r) => r.order)) : 0;
  const orderById = new Map(vgRows.map((r) => [r.id, r.order]));

  const machineLearnMoves = await gql<{ pokemonmove: { move_id: number }[] }>(
    `query ($vgs: [Int!]) {
      pokemonmove(where: { version_group_id: { _in: $vgs }, movelearnmethod: { name: { _eq: "machine" } } }, distinct_on: move_id) { move_id }
    }`,
    { vgs: learnsetIds },
  );

  const { move, machine } = await gql<{ move: MoveRow[]; machine: MachineRow[] }>(
    `query ($vgs: [Int!]) {
      move(where: { pokemonmoves: { version_group_id: { _in: $vgs } } }, order_by: { id: asc }) {
        id name power pp accuracy
        type { name }
        movedamageclass { name }
        movenames(where: { language_id: { _eq: ${ENGLISH} } }) { name }
        movechanges { version_group_id power pp accuracy type { name } }
      }
      machine(where: { version_group_id: { _in: $vgs } }, order_by: { machine_number: asc }) {
        machine_number move_id version_group_id item { name }
      }
    }`,
    { vgs: learnsetIds },
  );

  const moves: Record<string, MoveInfo> = {};
  for (const row of move) {
    const type = row.type?.name;
    if (!type || !isTypeName(type)) continue;
    const values = resolveMoveValues(
      { power: row.power, accuracy: row.accuracy, pp: row.pp, type },
      row.movechanges.map((c) => ({
        versionGroupOrder: orderById.get(c.version_group_id) ?? 0,
        power: c.power,
        accuracy: c.accuracy,
        pp: c.pp,
        type: c.type && isTypeName(c.type.name) ? c.type.name : null,
      })),
      targetOrder,
    );
    const rawCategory = (row.movedamageclass?.name ?? "status") as MoveCategory;
    moves[String(row.id)] = {
      id: row.id,
      slug: row.name,
      name: row.movenames[0]?.name ?? row.name,
      type: values.type,
      category: resolveMoveCategory(rawCategory, values.type, vg.generation),
      power: values.power,
      accuracy: values.accuracy,
      pp: values.pp,
    };
  }

  const machines: Record<string, string> = {};
  for (const row of machine) {
    const label = row.item ? machineLabel(row.item.name, vg.generation) : null;
    if (label) machines[String(row.move_id)] = label;
  }

  const index: MoveIndex = {
    schemaVersion: SCHEMA_VERSION,
    versionGroup: vg.id,
    generatedAt: new Date().toISOString(),
    moves,
    machines,
  };
  const machineMoveIds = new Set(machineLearnMoves.pokemonmove.map((m) => m.move_id));
  const withoutLabel = [...machineMoveIds].filter((id) => !machines[String(id)]).length;
  return {
    index,
    machineStats: { machineMoves: machineMoveIds.size, withoutLabel, records: machine.length },
  };
}

async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data)}\n`, "utf8");
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}

async function main() {
  const reference = await loadReference();
  const groups = Object.values(VERSION_GROUPS) as VersionGroupConfig[];
  const generations = [...new Set(groups.map((g) => g.generation))].sort((a, b) => a - b);

  await writeJson(
    path.join(OUT_DIR, "type-chart.json"),
    buildTypeChartFile(reference.type, generations),
  );

  const versionGroups: VersionGroupFile = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    versionGroups: reference.versiongroup.map((vg) => ({
      name: vg.name,
      order: vg.order,
      generation: vg.generation_id,
    })),
  };
  await writeJson(path.join(OUT_DIR, "version-groups.json"), versionGroups);

  const library: LibraryFile = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    versionGroups: {},
    games: {},
  };

  for (const vg of groups) {
    const [{ catalog, dexSpeciesCount, speciesWithLearnset }, { index, machineStats }] =
      await Promise.all([buildCatalog(vg, reference), buildMoveIndex(vg, reference.versiongroup)]);
    console.log(
      `[${vg.id}] ${catalog.entries.length} species, dexes ${catalog.dexes.map((d) => `${d.id}=${d.size}`).join(" ")}, ${Object.keys(index.moves).length} moves, ${Object.keys(index.machines).length} machines`,
    );
    await writeJson(path.join(OUT_DIR, vg.id, "catalog.json"), catalog);
    await writeJson(path.join(OUT_DIR, vg.id, "moves.json"), index);

    const defaultDex = vg.pokedexes[0].id;
    library.versionGroups[vg.id] = {
      dexes: catalog.dexes,
      defaultDexSpecies: catalog.entries
        .filter((e) => e.dex[defaultDex] !== undefined)
        .map((e) => e.id),
    };
    for (const game of Object.values(GAMES).filter((g) => g.versionGroup === vg.id)) {
      library.games[game.id] = await measureGame(
        game,
        vg,
        dexSpeciesCount,
        speciesWithLearnset,
        machineStats,
      );
    }
  }

  await writeJson(path.join(OUT_DIR, "library.json"), library);
  await writeFile(path.join(OUT_DIR, "catalogs.ts"), catalogRegistrySource(groups), "utf8");
  console.log("wrote src/data/generated/catalogs.ts");
}

/** Static import registry so the server bundle includes exactly the generated catalogs. */
function catalogRegistrySource(groups: VersionGroupConfig[]): string {
  const id = (vg: string) => vg.replace(/[^a-z0-9]/gi, "_");
  const lines = [
    "// Generated by scripts/generate-data.ts — do not edit.",
    'import type { GameCatalog, MoveIndex } from "@/types/domain";',
    "",
    ...groups.flatMap((g) => [
      `import ${id(g.id)}Catalog from "./${g.id}/catalog.json";`,
      `import ${id(g.id)}Moves from "./${g.id}/moves.json";`,
    ]),
    "",
    "export const CATALOGS: Record<string, GameCatalog> = {",
    ...groups.map((g) => `  "${g.id}": ${id(g.id)}Catalog as unknown as GameCatalog,`),
    "};",
    "",
    "export const MOVE_INDEXES: Record<string, MoveIndex> = {",
    ...groups.map((g) => `  "${g.id}": ${id(g.id)}Moves as unknown as MoveIndex,`),
    "};",
    "",
  ];
  return lines.join("\n");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
