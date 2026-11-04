import typeChartFile from "@/data/generated/type-chart.json";
import type { TypeChart, TypeChartFile, TypeName } from "@/types/domain";

const chartFile = typeChartFile as TypeChartFile;

export interface GenerationTypeChart {
  types: TypeName[];
  chart: TypeChart;
}

export function getTypeChart(generation: number): GenerationTypeChart {
  const entry = chartFile.byGeneration[String(generation)];
  if (!entry) throw new Error(`No type chart generated for generation ${generation}`);
  return entry;
}

export function attackMultiplier(chart: TypeChart, attacker: TypeName, defender: TypeName): number {
  return chart[attacker]?.[defender] ?? 1;
}

export interface Matchup {
  type: TypeName;
  multiplier: number;
}

export interface DefensiveProfile {
  weaknesses: Matchup[];
  resistances: Matchup[];
  immunities: Matchup[];
}

/** Damage multipliers taken by a Pokémon with `defenderTypes`, per attacking type. */
export function defensiveProfile(
  defenderTypes: readonly TypeName[],
  { types, chart }: GenerationTypeChart,
): DefensiveProfile {
  const profile: DefensiveProfile = { weaknesses: [], resistances: [], immunities: [] };
  for (const attacker of types) {
    const multiplier = defenderTypes.reduce(
      (acc, defender) => acc * attackMultiplier(chart, attacker, defender),
      1,
    );
    if (multiplier === 0) profile.immunities.push({ type: attacker, multiplier });
    else if (multiplier > 1) profile.weaknesses.push({ type: attacker, multiplier });
    else if (multiplier < 1) profile.resistances.push({ type: attacker, multiplier });
  }
  profile.weaknesses.sort((a, b) => b.multiplier - a.multiplier);
  profile.resistances.sort((a, b) => a.multiplier - b.multiplier);
  return profile;
}

export function formatMultiplier(multiplier: number): string {
  if (multiplier === 0.25) return "¼×";
  if (multiplier === 0.5) return "½×";
  return `${multiplier}×`;
}
