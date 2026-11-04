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

import { VERSION_GROUPS, type VersionGroupConfig } from "../src/features/games/config";
import {
  buildTypeChart,
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
  type CatalogForm,
  type GameCatalog,
  type MoveCategory,
  type MoveIndex,
  type MoveInfo,
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

async function loadReference() {
  return gql<{ versiongroup: VersionGroupRow[]; type: TypeRow[] }>(`
    query {
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

function isPreferredForm(row: PokemonRow, tag: string | undefined): boolean {
  if (!tag || row.is_default) return false;
  const parts = row.name.split("-");
  return parts.includes(tag) && !parts.includes("gmax");
}

async function buildCatalog(vg: VersionGroupConfig, vgRows: VersionGroupRow[]) {
  const learnsetIds = vgRows
    .filter((r) => vg.learnsetVersionGroups.includes(r.name))
    .map((r) => r.id);

  const dexes = await Promise.all(
    vg.pokedexes.map((d) => request<RestPokedex>(`${REST}/pokedex/${d.id}`)),
  );

  const { pokemon } = await gql<{ pokemon: PokemonRow[] }>(
    `query ($vgs: [Int!]) {
      pokemon(where: { pokemonmoves: { version_group_id: { _in: $vgs } } }, order_by: { id: asc }) {
        id name is_default pokemon_species_id
        pokemontypes { slot type { name } }
        pokemontypepasts { generation_id slot type { name } }
        pokemonforms { is_default form_name pokemonformnames(where: { language_id: { _eq: ${ENGLISH} } }) { name pokemon_name } }
        pokemonspecy {
          name is_legendary is_mythical
          pokemonspeciesnames(where: { language_id: { _eq: ${ENGLISH} } }) { name }
        }
      }
    }`,
    { vgs: learnsetIds },
  );

  const bySpecies = new Map<number, PokemonRow[]>();
  for (const row of pokemon) {
    const list = bySpecies.get(row.pokemon_species_id) ?? [];
    list.push(row);
    bySpecies.set(row.pokemon_species_id, list);
  }

  const dexNumbers = new Map<number, Record<string, number>>();
  vg.pokedexes.forEach((config, index) => {
    for (const entry of dexes[index].pokemon_entries) {
      const speciesId = idFromUrl(entry.pokemon_species.url);
      const record = dexNumbers.get(speciesId) ?? {};
      record[config.id] = entry.entry_number;
      dexNumbers.set(speciesId, record);
    }
  });

  const baseDexIds = new Set(vg.pokedexes.filter((d) => d.kind === "base").map((d) => d.id));
  const entries: CatalogEntry[] = [];
  const missingFromLearnsets: number[] = [];

  for (const speciesId of dexNumbers.keys()) {
    if (!bySpecies.has(speciesId)) missingFromLearnsets.push(speciesId);
  }

  for (const [speciesId, rows] of [...bySpecies.entries()].sort((a, b) => a[0] - b[0])) {
    const dex = dexNumbers.get(speciesId) ?? {};
    const dexIds = Object.keys(dex);
    const availability: Availability = dexIds.some((id) => baseDexIds.has(id))
      ? "regional"
      : dexIds.length > 0
        ? "dlc"
        : "outside-dex";

    const forms: CatalogForm[] = rows
      .filter((r) => !r.name.split("-").includes("gmax"))
      .map((r) => ({
        id: r.id,
        slug: r.name,
        label: formLabel(r),
        types: typesForGeneration(r, vg.generation),
      }));

    const display =
      rows.find((r) => isPreferredForm(r, vg.preferredFormTag)) ??
      rows.find((r) => r.is_default) ??
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
      forms,
      legendary: species.is_legendary,
      mythical: species.is_mythical,
    });
  }

  if (missingFromLearnsets.length > 0) {
    console.warn(
      `[${vg.id}] ${missingFromLearnsets.length} dex species have no learnset in PokéAPI:`,
      missingFromLearnsets.join(", "),
    );
  }

  const catalog: GameCatalog = {
    schemaVersion: SCHEMA_VERSION,
    versionGroup: vg.id,
    generatedAt: new Date().toISOString(),
    source: "PokéAPI (graphql.pokeapi.co/v1beta2 + pokeapi.co/api/v2/pokedex)",
    entries,
  };
  return catalog;
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
  const targetOrder = Math.min(...learnset.map((r) => r.order));
  const orderById = new Map(vgRows.map((r) => [r.id, r.order]));

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
    const item = row.item?.name;
    if (!item) continue;
    const kind = vg.machineKinds.find((k) => item.startsWith(k.itemPrefix));
    if (!kind) continue;
    machines[String(row.move_id)] = `${kind.label}${item.slice(kind.itemPrefix.length)}`;
  }

  const index: MoveIndex = {
    schemaVersion: SCHEMA_VERSION,
    versionGroup: vg.id,
    generatedAt: new Date().toISOString(),
    moves,
    machines,
  };
  return index;
}

async function writeJson(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data)}\n`, "utf8");
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}

async function main() {
  const reference = await loadReference();
  const groups = Object.values(VERSION_GROUPS);
  const generations = [...new Set(groups.map((g) => g.generation))];

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

  for (const vg of groups) {
    const [catalog, moves] = await Promise.all([
      buildCatalog(vg, reference.versiongroup),
      buildMoveIndex(vg, reference.versiongroup),
    ]);
    console.log(
      `[${vg.id}] ${catalog.entries.length} species, ${Object.keys(moves.moves).length} moves, ${Object.keys(moves.machines).length} machines`,
    );
    await writeJson(path.join(OUT_DIR, vg.id, "catalog.json"), catalog);
    await writeJson(path.join(OUT_DIR, vg.id, "moves.json"), moves);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
