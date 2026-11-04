/**
 * User-facing labels (pt-BR). Pokémon, move, ability and item names stay in
 * English because that is how they appear in Sword/Shield in Brazil.
 */

import type { LearnMethod, MoveCategory, StatKey, TypeName } from "@/types/domain";

export const TYPE_LABELS: Record<TypeName, string> = {
  normal: "Normal",
  fire: "Fogo",
  water: "Água",
  electric: "Elétrico",
  grass: "Planta",
  ice: "Gelo",
  fighting: "Lutador",
  poison: "Venenoso",
  ground: "Terrestre",
  flying: "Voador",
  psychic: "Psíquico",
  bug: "Inseto",
  rock: "Pedra",
  ghost: "Fantasma",
  dragon: "Dragão",
  dark: "Sombrio",
  steel: "Aço",
  fairy: "Fada",
};

export const STAT_LABELS: Record<StatKey, { label: string; short: string }> = {
  hp: { label: "HP", short: "HP" },
  attack: { label: "Ataque", short: "Atq" },
  defense: { label: "Defesa", short: "Def" },
  "special-attack": { label: "Ataque Especial", short: "Atq Esp" },
  "special-defense": { label: "Defesa Especial", short: "Def Esp" },
  speed: { label: "Velocidade", short: "Vel" },
};

export const CATEGORY_LABELS: Record<MoveCategory, string> = {
  physical: "Físico",
  special: "Especial",
  status: "Status",
};

export const LEARN_METHOD_LABELS: Record<LearnMethod, string> = {
  "level-up": "Por nível",
  machine: "Máquinas",
  egg: "Egg Moves",
  tutor: "Tutor",
  other: "Outros",
};

/** "leaf-stone" → "Leaf Stone" */
export function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatHeight(decimeters: number): string {
  return `${(decimeters / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} m`;
}

export function formatWeight(hectograms: number): string {
  return `${(hectograms / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}
