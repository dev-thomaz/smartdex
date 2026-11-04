import "server-only";

import { cacheLife } from "next/cache";

import { GAMES, getGame, getVersionGroup, type GameId } from "@/features/games/config";
import { getCatalog, getMoveIndex, resolveEntry } from "@/features/pokedex/catalog";
import {
  adaptAbilities,
  adaptEncounters,
  adaptEvolutionChain,
  adaptLearnset,
  adaptStats,
  adaptTypes,
  cleanFlavorText,
  officialArtworkUrl,
} from "@/lib/api/pokeapi/adapters";
import { fetchPokeApi } from "@/lib/api/pokeapi/client";
import {
  rawAbilitySchema,
  rawEncountersSchema,
  rawEvolutionChainSchema,
  rawPokemonSchema,
  rawSpeciesSchema,
} from "@/lib/api/pokeapi/schemas";
import versionGroupsFile from "@/data/generated/version-groups.json";
import { prettifySlug } from "@/lib/labels";
import type { AbilityInfo, PokemonDetail, VersionGroupFile } from "@/types/domain";

const VERSION_GROUP_ORDER: Record<string, number> = Object.fromEntries(
  (versionGroupsFile as VersionGroupFile).versionGroups.map((vg) => [vg.name, vg.order]),
);

const ENGLISH = "en";

async function getAbilityInfo(
  slug: string,
  hidden: boolean,
  versionGroups: string[],
): Promise<AbilityInfo> {
  "use cache";
  cacheLife("max");
  try {
    const raw = await fetchPokeApi(`ability/${slug}`, rawAbilitySchema);
    const name = raw.names.find((n) => n.language.name === ENGLISH)?.name ?? prettifySlug(slug);
    const flavor =
      raw.flavor_text_entries.find(
        (f) => f.language.name === ENGLISH && versionGroups.includes(f.version_group.name),
      )?.flavor_text ??
      raw.effect_entries.find((e) => e.language.name === ENGLISH)?.short_effect ??
      null;
    return { slug, name, hidden, description: flavor ? cleanFlavorText(flavor) : null };
  } catch {
    return { slug, name: prettifySlug(slug), hidden, description: null };
  }
}

/**
 * Everything the detail page shows, resolved for ONE game. Cached per
 * (game, slug) because flavor text and encounters differ between versions.
 */
export async function getPokemonDetail(
  gameId: GameId,
  slug: string,
): Promise<PokemonDetail | null> {
  "use cache";
  cacheLife("weeks");

  const game = getGame(gameId);
  const vg = getVersionGroup(game.versionGroup);
  const resolved = resolveEntry(vg.id, slug);
  if (!resolved) return null;
  const { entry, form } = resolved;

  const [pokemon, species, encounters] = await Promise.all([
    fetchPokeApi(`pokemon/${form.id}`, rawPokemonSchema),
    fetchPokeApi(`pokemon-species/${entry.id}`, rawSpeciesSchema),
    fetchPokeApi(`pokemon/${form.id}/encounters`, rawEncountersSchema),
  ]);

  const chain = species.evolution_chain
    ? await fetchPokeApi(species.evolution_chain.url, rawEvolutionChainSchema)
    : null;

  const moveIndex = getMoveIndex(vg.id);
  const catalog = getCatalog(vg.id);
  const namesById = new Map(catalog.entries.map((e) => [e.id, e.name]));
  const moveNameBySlug = new Map(Object.values(moveIndex.moves).map((m) => [m.slug, m.name]));

  const abilities = await Promise.all(
    adaptAbilities(pokemon, vg.generation).map((a) =>
      getAbilityInfo(a.slug, a.hidden, vg.learnsetVersionGroups),
    ),
  );

  const flavor = species.flavor_text_entries.find(
    (f) => f.language.name === ENGLISH && f.version.name === game.pokeapiVersion,
  )?.flavor_text;

  return {
    speciesId: entry.id,
    pokemonId: form.id,
    slug: form.slug,
    speciesSlug: entry.slug,
    name: entry.name,
    formLabel: form.id === entry.id && entry.forms.length <= 1 ? null : form.label,
    genus: species.genera.find((g) => g.language.name === ENGLISH)?.genus ?? null,
    flavorText: flavor ? cleanFlavorText(flavor) : null,
    types: adaptTypes(pokemon, vg.generation),
    heightDm: pokemon.height,
    weightHg: pokemon.weight,
    abilities,
    stats: adaptStats(pokemon, vg.generation),
    moves: adaptLearnset(pokemon.moves, {
      versionGroups: vg.learnsetVersionGroups,
      moveIndex,
    }),
    evolution: chain
      ? adaptEvolutionChain(chain.chain, {
          versionGroups: vg.learnsetVersionGroups,
          versionGroupOrder: VERSION_GROUP_ORDER,
          inGame: (id) => namesById.has(id),
          speciesName: (id, s) => namesById.get(id) ?? prettifySlug(s),
          moveName: (s) => moveNameBySlug.get(s) ?? prettifySlug(s),
        })
      : null,
    encounters: adaptEncounters(encounters, {
      versions: game.encounterVersions,
      region: vg.region,
    }),
    encountersInSiblingGames: Object.values(GAMES)
      .filter((g) => g.id !== game.id && g.versionGroup === game.versionGroup)
      .filter(
        (g) =>
          adaptEncounters(encounters, { versions: g.encounterVersions, region: vg.region }).length >
          0,
      )
      .map((g) => g.name),
    artworkUrl: officialArtworkUrl(form.id),
  };
}
