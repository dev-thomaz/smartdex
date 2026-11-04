/**
 * Pure adapters: PokéAPI REST shapes → SmartDex domain.
 * No fetching here, so every rule is unit-testable with fixtures.
 */

import { prettifySlug, TYPE_LABELS } from "@/lib/labels";
import {
  isTypeName,
  type EncounterInfo,
  type EvolutionCondition,
  type EvolutionNode,
  type LearnedMove,
  type LearnMethod,
  type MoveIndex,
  type StatKey,
  type StatValue,
  type TypeName,
} from "@/types/domain";

export { officialArtworkUrl } from "./artwork";
import { resolveForGeneration } from "./resolve";
import {
  generationNumber,
  idFromUrl,
  type RawChainLink,
  type RawEncounters,
  type RawEvolutionDetail,
  type RawPokemon,
} from "./schemas";

/* ------------------------------------------------------------------ types */

export function adaptTypes(raw: RawPokemon, generation: number): TypeName[] {
  const toTypes = (list: { slot: number; type: { name: string } }[]) =>
    [...list]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name)
      .filter(isTypeName);
  return resolveForGeneration(
    toTypes(raw.types),
    raw.past_types.map((p) => ({
      generation: generationNumber(p.generation),
      value: toTypes(p.types),
    })),
    generation,
  );
}

/* ------------------------------------------------------------------ stats */

const STAT_ORDER: StatKey[] = [
  "hp",
  "attack",
  "defense",
  "special-attack",
  "special-defense",
  "speed",
];

export function adaptStats(raw: RawPokemon, generation: number): StatValue[] {
  const current = new Map(raw.stats.map((s) => [s.stat.name, s.base_stat]));
  const resolved = new Map(current);
  // Past stats only list the stats that changed; resolve each stat on its own.
  for (const key of STAT_ORDER) {
    const past = raw.past_stats
      .map((p) => ({
        generation: generationNumber(p.generation),
        value: p.stats.find((s) => s.stat.name === key)?.base_stat,
      }))
      .filter((p): p is { generation: number; value: number } => p.value !== undefined);
    const value = resolveForGeneration(current.get(key) ?? 0, past, generation);
    resolved.set(key, value);
  }
  return STAT_ORDER.map((key) => ({ key, value: resolved.get(key) ?? 0 }));
}

/* -------------------------------------------------------------- abilities */

export interface AbilitySlot {
  slug: string;
  hidden: boolean;
}

export function adaptAbilities(raw: RawPokemon, generation: number): AbilitySlot[] {
  const bySlot = new Map(raw.abilities.map((a) => [a.slot, a]));
  const candidates = raw.past_abilities
    .map((p) => ({ generation: generationNumber(p.generation), abilities: p.abilities }))
    .filter((p) => p.generation >= generation)
    .sort((a, b) => a.generation - b.generation);
  const past = candidates[0];
  if (past) {
    for (const ability of past.abilities) bySlot.set(ability.slot, ability);
  }
  return [...bySlot.values()]
    .sort((a, b) => a.slot - b.slot)
    .flatMap((a) => (a.ability ? [{ slug: a.ability.name, hidden: a.is_hidden }] : []));
}

/* -------------------------------------------------------------- learnsets */

export interface LearnsetContext {
  versionGroups: readonly string[];
  moveIndex: MoveIndex;
}

function toLearnMethod(raw: string): LearnMethod {
  if (raw === "level-up" || raw === "machine" || raw === "egg" || raw === "tutor") return raw;
  return "other";
}

/**
 * Moves learnable in the game's version groups ONLY. Moves from any other
 * version group are discarded — generations are never mixed.
 */
export function adaptLearnset(moves: RawPokemon["moves"], ctx: LearnsetContext): LearnedMove[] {
  const groups = new Set(ctx.versionGroups);
  const seen = new Set<string>();
  const result: LearnedMove[] = [];
  for (const entry of moves) {
    const moveId = idFromUrl(entry.move.url);
    const move = ctx.moveIndex.moves[String(moveId)];
    for (const detail of entry.version_group_details) {
      if (!groups.has(detail.version_group.name)) continue;
      if (!move) continue;
      const method = toLearnMethod(detail.move_learn_method.name);
      const level = method === "level-up" ? detail.level_learned_at : null;
      const key = `${moveId}:${detail.move_learn_method.name}:${level ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const machine =
        method === "machine" ? (ctx.moveIndex.machines[String(moveId)] ?? null) : null;
      result.push({
        move,
        method,
        level,
        machine,
        machineKind: machine ? machine.replace(/\d+$/, "") : null,
        rawMethod: detail.move_learn_method.name,
      });
    }
  }
  return sortLearnset(result);
}

export function sortLearnset(moves: LearnedMove[]): LearnedMove[] {
  return [...moves].sort((a, b) => {
    if (a.method !== b.method) return a.method.localeCompare(b.method);
    if (a.method === "level-up")
      return (a.level ?? 0) - (b.level ?? 0) || a.move.name.localeCompare(b.move.name);
    if (a.method === "machine") {
      return (a.machine ?? "").localeCompare(b.machine ?? "", "en", { numeric: true });
    }
    return a.move.name.localeCompare(b.move.name);
  });
}

/* -------------------------------------------------------------- evolution */

export interface EvolutionContext {
  versionGroups: readonly string[];
  /** PokéAPI version group name → chronological order. */
  versionGroupOrder: Readonly<Record<string, number>>;
  inGame: (speciesId: number) => boolean;
  speciesName: (speciesId: number, slug: string) => string;
  moveName: (slug: string) => string;
}

export interface SelectedEvolutionDetail {
  detail: RawEvolutionDetail;
  /** Version group the detail was recorded in, when not the game's own. */
  recordedIn: string | null;
}

/**
 * Picks the evolution details valid for the game.
 *
 * PokéAPI files a method under the version group where it was introduced or
 * last changed, so the valid record is the most recent one at or before the
 * game. Regional forms evolve independently (Kantonian vs Alolan Meowth), so
 * the choice is made per `required_pokemon_form`. Records without a version
 * group are legacy data, used only when nothing else exists for that form.
 */
export function selectEvolutionDetails(
  details: RawEvolutionDetail[],
  ctx: Pick<EvolutionContext, "versionGroups" | "versionGroupOrder">,
): SelectedEvolutionDetail[] {
  const own = new Set(ctx.versionGroups);
  const target = Math.max(...ctx.versionGroups.map((vg) => ctx.versionGroupOrder[vg] ?? -1));
  const orderOf = (d: RawEvolutionDetail) =>
    d.version_group ? ctx.versionGroupOrder[d.version_group.name] : undefined;

  const byForm = new Map<string, RawEvolutionDetail[]>();
  for (const d of details) {
    const key = d.required_pokemon_form?.name ?? "";
    byForm.set(key, [...(byForm.get(key) ?? []), d]);
  }

  const result: SelectedEvolutionDetail[] = [];
  for (const group of byForm.values()) {
    let best = -Infinity;
    for (const d of group) {
      const order = orderOf(d);
      if (order !== undefined && order <= target && order > best) best = order;
    }
    if (best === -Infinity) {
      for (const d of group.filter((g) => !g.version_group))
        result.push({ detail: d, recordedIn: null });
      continue;
    }
    for (const d of group) {
      if (orderOf(d) !== best || !d.version_group) continue;
      const name = d.version_group.name;
      result.push({ detail: d, recordedIn: own.has(name) ? null : name });
    }
  }
  return result;
}

const TIME_OF_DAY: Record<string, string> = {
  day: "durante o dia",
  night: "à noite",
  dusk: "ao entardecer",
};

function speciesFromResource(
  resource: { name: string; url: string },
  ctx: EvolutionContext,
): string {
  return ctx.speciesName(idFromUrl(resource.url), resource.name);
}

/** Translates one PokéAPI evolution detail into readable conditions. */
export function describeEvolutionDetail(
  detail: RawEvolutionDetail,
  ctx: EvolutionContext,
): EvolutionCondition[] {
  const parts: string[] = [];
  const trigger = detail.trigger.name;

  switch (trigger) {
    case "level-up":
      parts.push(detail.min_level ? `Nível ${detail.min_level}` : "Subir de nível");
      break;
    case "use-item":
      parts.push(detail.item ? `Usar ${prettifySlug(detail.item.name)}` : "Usar um item");
      break;
    case "trade":
      parts.push("Troca");
      break;
    case "shed":
      parts.push("Surge ao evoluir Nincada, com vaga na equipe e uma Poké Ball na bolsa");
      break;
    case "spin":
      parts.push("Girar o personagem com o Pokémon segurando um doce");
      break;
    case "tower-of-darkness":
      parts.push("Concluir a Tower of Darkness");
      break;
    case "tower-of-waters":
      parts.push("Concluir a Tower of Waters");
      break;
    case "three-critical-hits":
      parts.push("Acertar 3 golpes críticos na mesma batalha");
      break;
    case "take-damage":
      parts.push("Receber dano em batalha sem desmaiar");
      break;
    default:
      parts.push(prettifySlug(trigger));
  }

  if (trigger !== "use-item" && detail.item) parts.push(`usando ${prettifySlug(detail.item.name)}`);
  if (detail.held_item) parts.push(`segurando ${prettifySlug(detail.held_item.name)}`);
  if (detail.trade_species) parts.push(`por ${speciesFromResource(detail.trade_species, ctx)}`);
  if (detail.min_happiness) parts.push(`amizade alta (≥ ${detail.min_happiness})`);
  if (detail.min_affection) parts.push(`afeição ≥ ${detail.min_affection}`);
  if (detail.min_beauty) parts.push(`beleza ≥ ${detail.min_beauty}`);
  if (detail.time_of_day && TIME_OF_DAY[detail.time_of_day])
    parts.push(TIME_OF_DAY[detail.time_of_day]);
  if (detail.known_move) parts.push(`conhecendo ${ctx.moveName(detail.known_move.name)}`);
  if (detail.known_move_type && isTypeName(detail.known_move_type.name)) {
    parts.push(`conhecendo um golpe do tipo ${TYPE_LABELS[detail.known_move_type.name]}`);
  }
  if (detail.location) parts.push(`em ${prettifySlug(detail.location.name)}`);
  if (detail.needs_overworld_rain) parts.push("com chuva no mapa");
  if (detail.party_species)
    parts.push(`com ${speciesFromResource(detail.party_species, ctx)} na equipe`);
  if (detail.party_type && isTypeName(detail.party_type.name)) {
    parts.push(`com um Pokémon do tipo ${TYPE_LABELS[detail.party_type.name]} na equipe`);
  }
  if (detail.relative_physical_stats === 1) parts.push("com Ataque maior que Defesa");
  if (detail.relative_physical_stats === -1) parts.push("com Ataque menor que Defesa");
  if (detail.relative_physical_stats === 0) parts.push("com Ataque igual à Defesa");
  if (detail.gender === 1) parts.push("somente fêmeas");
  if (detail.gender === 2) parts.push("somente machos");
  if (detail.turn_upside_down) parts.push("com o console de cabeça para baixo");
  if (detail.required_pokemon_form?.name.includes("-")) {
    const tag = detail.required_pokemon_form.name.split("-").slice(1).join("-");
    parts.push(`a partir da forma ${prettifySlug(tag)}`);
  }

  return parts.map((text) => ({ text }));
}

export function adaptEvolutionChain(chain: RawChainLink, ctx: EvolutionContext): EvolutionNode {
  const build = (link: RawChainLink, isRoot: boolean): EvolutionNode => {
    const speciesId = idFromUrl(link.species.url);
    const selected = isRoot ? [] : selectEvolutionDetails(link.evolution_details, ctx);
    return {
      speciesId,
      slug: link.species.name,
      name: ctx.speciesName(speciesId, link.species.name),
      inGame: ctx.inGame(speciesId),
      methods: selected.map(({ detail, recordedIn }) => ({
        conditions: describeEvolutionDetail(detail, ctx),
        recordedIn,
      })),
      children: link.evolves_to.map((child) => build(child, false)),
    };
  };
  return build(chain, true);
}

/* ------------------------------------------------------------- encounters */

export type EncounterCategory = "wild" | "raid" | "gift" | "trade";

const METHOD_LABELS: Record<string, { label: string; category: EncounterCategory }> = {
  walk: { label: "Grama alta ou caverna", category: "wild" },
  overworld: { label: "Visível no mapa", category: "wild" },
  "overworld-water": { label: "Visível na água", category: "wild" },
  "overworld-flying": { label: "Voando no mapa", category: "wild" },
  "overworld-dirt": { label: "Surge do chão ou pântano", category: "wild" },
  wanderer: { label: "Aparição especial fixa", category: "wild" },
  "wanderer-water": { label: "Aparição especial na água", category: "wild" },
  "chase-water": { label: "Persegue na água", category: "wild" },
  "bubbling-spots": { label: "Pesca em pontos borbulhantes", category: "wild" },
  "berry-trees": { label: "Árvore de frutas", category: "wild" },
  static: { label: "Encontro fixo", category: "gift" },
  gift: { label: "Presente", category: "gift" },
  "npc-trade": { label: "Troca com NPC", category: "trade" },
  "max-raid": { label: "Max Raid", category: "raid" },
  "dynamax-adventure": { label: "Dynamax Adventure", category: "raid" },
};

export function encounterMethodInfo(method: string): {
  label: string;
  category: EncounterCategory;
} {
  return METHOD_LABELS[method] ?? { label: prettifySlug(method), category: "wild" };
}

const WEATHER: Record<string, string> = {
  "weather-normal": "Clima normal",
  "weather-overcast": "Nublado",
  "weather-raining": "Chuva",
  "weather-thunderstorm": "Tempestade",
  "weather-intense-sun": "Sol forte",
  "weather-snowing": "Neve",
  "weather-snowstorm": "Nevasca",
  "weather-sandstorm": "Tempestade de areia",
  "weather-fog": "Neblina",
};

export function describeCondition(slug: string): string {
  if (WEATHER[slug]) return WEATHER[slug];
  const stars = slug.match(/^max-den-rating-(\d)-star$/);
  if (stars) return `${stars[1]}★`;
  if (slug === "max-den-rarity-common") return "Comum";
  if (slug === "max-den-rarity-rare") return "Raro";
  if (slug === "max-den-rarity-special") return "Especial";
  const prefixes: [string, string][] = [
    ["story-progress-", "Progresso: "],
    ["trade-", "Em troca de "],
    ["save-data-from-", "Com save de "],
    ["starter-", "Inicial escolhido: "],
    ["item-", "Item: "],
    ["other-", ""],
  ];
  for (const [prefix, label] of prefixes) {
    if (slug.startsWith(prefix)) return `${label}${prettifySlug(slug.slice(prefix.length))}`;
  }
  return prettifySlug(slug);
}

/** "galar-route-1-area" → "Route 1"; "rolling-fields-max-den-a" → "Rolling Fields". */
export function describeLocationArea(
  slug: string,
  region: string,
): { location: string; spot: string | null } {
  let base = slug.replace(new RegExp(`^${region}-`), "");
  let spot: string | null = null;
  const den = base.match(/^(.*)-max-den-([a-z0-9]+)$/);
  if (den) {
    base = den[1];
    spot = `Toca ${den[2].toUpperCase()}`;
  }
  base = base.replace(/-area$/, "");
  return { location: prettifySlug(base), spot };
}

export interface EncounterContext {
  versions: readonly string[];
  region: string;
}

/**
 * Encounters for the game's versions only, merged per location + method so
 * the same den or route is not repeated for every weather/star variant.
 */
export function adaptEncounters(raw: RawEncounters, ctx: EncounterContext): EncounterInfo[] {
  const versions = new Set(ctx.versions);
  const merged = new Map<
    string,
    EncounterInfo & { spots: Set<string>; conditionSet: Set<string> }
  >();

  for (const area of raw) {
    const { location, spot } = describeLocationArea(area.location_area.name, ctx.region);
    for (const versionDetail of area.version_details) {
      if (!versions.has(versionDetail.version.name)) continue;
      for (const detail of versionDetail.encounter_details) {
        const key = `${location}|${detail.method.name}`;
        const conditions = detail.condition_values.map((c) => describeCondition(c.name));
        const existing = merged.get(key);
        if (existing) {
          existing.minLevel = Math.min(existing.minLevel, detail.min_level);
          existing.maxLevel = Math.max(existing.maxLevel, detail.max_level);
          if (detail.chance != null)
            existing.chance = Math.max(existing.chance ?? 0, detail.chance);
          if (spot) existing.spots.add(spot);
          for (const c of conditions) existing.conditionSet.add(c);
        } else {
          merged.set(key, {
            locationSlug: area.location_area.name,
            location,
            method: detail.method.name,
            minLevel: detail.min_level,
            maxLevel: detail.max_level,
            chance: detail.chance ?? null,
            conditions: [],
            version: versionDetail.version.name,
            spots: new Set(spot ? [spot] : []),
            conditionSet: new Set(conditions),
          });
        }
      }
    }
  }

  return [...merged.values()]
    .map(({ spots, conditionSet, ...info }) => ({
      ...info,
      conditions: [
        ...(spots.size > 0 ? [[...spots].sort().join(", ")] : []),
        ...[...conditionSet].sort(sortConditions),
      ],
    }))
    .sort((a, b) => a.location.localeCompare(b.location) || a.method.localeCompare(b.method));
}

function sortConditions(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { numeric: true });
}

/* ---------------------------------------------------------- misc helpers */

export function cleanFlavorText(text: string): string {
  return text
    .replace(/[\f\n\r\u00ad]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
