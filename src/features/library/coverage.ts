import type { GameDataCoverage } from "@/types/domain";

export interface CoverageNotice {
  area: "learnsets" | "machines" | "evolutions" | "encounters" | "flavorText" | "pokedex";
  text: string;
}

/** Human-readable gaps for a game, in display priority order. Empty = no known gaps. */
export function coverageNotices(coverage: GameDataCoverage | null): CoverageNotice[] {
  if (!coverage) return [{ area: "pokedex", text: "Cobertura de dados ainda não verificada." }];
  const notices: CoverageNotice[] = [];
  if (coverage.pokedex === "missing")
    notices.push({ area: "pokedex", text: "Pokédex sem composição validada." });
  if (coverage.learnsets === "missing")
    notices.push({ area: "learnsets", text: "Golpes indisponíveis na PokéAPI." });
  if (coverage.learnsets === "partial")
    notices.push({ area: "learnsets", text: "Golpes incompletos na PokéAPI." });
  if (coverage.machines === "partial")
    notices.push({ area: "machines", text: "Números de várias TMs/HMs ausentes." });
  if (coverage.encounters === "missing")
    notices.push({ area: "encounters", text: "Locais de encontro indisponíveis." });
  if (coverage.encounters === "partial")
    notices.push({ area: "encounters", text: "Locais de encontro incompletos." });
  return notices;
}

/** Partial = something essential for consulting the game is missing or incomplete. */
export function isPartialCoverage(coverage: GameDataCoverage | null): boolean {
  return coverageNotices(coverage).length > 0;
}
