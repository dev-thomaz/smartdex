/**
 * Zod schemas for the subset of PokéAPI REST responses SmartDex reads.
 * Unknown keys are stripped, which also keeps cached payloads small.
 */

import { z } from "zod";

export const namedResource = z.object({ name: z.string(), url: z.string() });
export type NamedResource = z.infer<typeof namedResource>;

const nullableResource = namedResource.nullable().optional();

export const rawPokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  height: z.number(),
  weight: z.number(),
  is_default: z.boolean(),
  species: namedResource,
  types: z.array(z.object({ slot: z.number(), type: namedResource })),
  past_types: z
    .array(
      z.object({
        generation: namedResource,
        types: z.array(z.object({ slot: z.number(), type: namedResource })),
      }),
    )
    .default([]),
  abilities: z.array(
    z.object({ ability: namedResource.nullable(), is_hidden: z.boolean(), slot: z.number() }),
  ),
  past_abilities: z
    .array(
      z.object({
        generation: namedResource,
        abilities: z.array(
          z.object({ ability: namedResource.nullable(), is_hidden: z.boolean(), slot: z.number() }),
        ),
      }),
    )
    .default([]),
  stats: z.array(z.object({ base_stat: z.number(), stat: namedResource })),
  past_stats: z
    .array(
      z.object({
        generation: namedResource,
        stats: z.array(z.object({ base_stat: z.number(), stat: namedResource })),
      }),
    )
    .default([]),
  moves: z.array(
    z.object({
      move: namedResource,
      version_group_details: z.array(
        z.object({
          level_learned_at: z.number(),
          move_learn_method: namedResource,
          version_group: namedResource,
        }),
      ),
    }),
  ),
});
export type RawPokemon = z.infer<typeof rawPokemonSchema>;

const localizedText = z.object({ language: namedResource });

export const rawSpeciesSchema = z.object({
  id: z.number(),
  name: z.string(),
  names: z.array(localizedText.extend({ name: z.string() })),
  genera: z.array(localizedText.extend({ genus: z.string() })),
  flavor_text_entries: z.array(
    localizedText.extend({ flavor_text: z.string(), version: namedResource }),
  ),
  evolution_chain: z.object({ url: z.string() }).nullable(),
  varieties: z.array(z.object({ is_default: z.boolean(), pokemon: namedResource })),
});
export type RawSpecies = z.infer<typeof rawSpeciesSchema>;

export const rawEvolutionDetailSchema = z.object({
  trigger: namedResource,
  version_group: nullableResource,
  min_level: z.number().nullable().optional(),
  item: nullableResource,
  held_item: nullableResource,
  known_move: nullableResource,
  known_move_type: nullableResource,
  location: nullableResource,
  min_happiness: z.number().nullable().optional(),
  min_affection: z.number().nullable().optional(),
  min_beauty: z.number().nullable().optional(),
  needs_overworld_rain: z.boolean().nullable().optional(),
  party_species: nullableResource,
  party_type: nullableResource,
  relative_physical_stats: z.number().nullable().optional(),
  time_of_day: z.string().nullable().optional(),
  trade_species: nullableResource,
  turn_upside_down: z.boolean().nullable().optional(),
  gender: z.number().nullable().optional(),
  required_pokemon_form: nullableResource,
});
export type RawEvolutionDetail = z.infer<typeof rawEvolutionDetailSchema>;

export interface RawChainLink {
  species: NamedResource;
  evolution_details: RawEvolutionDetail[];
  evolves_to: RawChainLink[];
}

export const rawChainLinkSchema: z.ZodType<RawChainLink> = z.lazy(() =>
  z.object({
    species: namedResource,
    evolution_details: z.array(rawEvolutionDetailSchema),
    evolves_to: z.array(rawChainLinkSchema),
  }),
);

export const rawEvolutionChainSchema = z.object({ id: z.number(), chain: rawChainLinkSchema });
export type RawEvolutionChain = z.infer<typeof rawEvolutionChainSchema>;

export const rawEncountersSchema = z.array(
  z.object({
    location_area: namedResource,
    version_details: z.array(
      z.object({
        version: namedResource,
        max_chance: z.number().nullable().optional(),
        encounter_details: z.array(
          z.object({
            min_level: z.number(),
            max_level: z.number(),
            chance: z.number().nullable().optional(),
            method: namedResource,
            condition_values: z.array(namedResource),
          }),
        ),
      }),
    ),
  }),
);
export type RawEncounters = z.infer<typeof rawEncountersSchema>;

export const rawAbilitySchema = z.object({
  name: z.string(),
  names: z.array(localizedText.extend({ name: z.string() })),
  flavor_text_entries: z.array(
    localizedText.extend({ flavor_text: z.string(), version_group: namedResource }),
  ),
  effect_entries: z.array(localizedText.extend({ short_effect: z.string() })),
});
export type RawAbility = z.infer<typeof rawAbilitySchema>;

/** Extracts the numeric id at the end of a PokéAPI resource URL. */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) throw new Error(`Cannot parse PokéAPI id from ${url}`);
  return Number(match[1]);
}

/** "generation-viii" → 8 */
export function generationNumber(resource: NamedResource): number {
  const roman = resource.name.replace("generation-", "").toUpperCase();
  const values: Record<string, number> = { I: 1, V: 5, X: 10 };
  let total = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = values[roman[i]] ?? 0;
    const next = values[roman[i + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}
