import { encounterMethodInfo, type EncounterCategory } from "@/lib/api/pokeapi/adapters";
import type { Availability, EncounterInfo } from "@/types/domain";

const CATEGORY_LABELS: Record<EncounterCategory, string> = {
  wild: "Na natureza",
  raid: "Raids e aventuras Dynamax",
  gift: "Presente ou encontro fixo",
  trade: "Troca no jogo",
};

const CATEGORY_ORDER: EncounterCategory[] = ["wild", "raid", "gift", "trade"];

function levels(e: EncounterInfo) {
  return e.minLevel === e.maxLevel ? `Nv. ${e.minLevel}` : `Nv. ${e.minLevel}–${e.maxLevel}`;
}

export function EncountersPanel({
  encounters,
  gameName,
  availability,
  preEvolution,
  siblingGames,
}: {
  encounters: EncounterInfo[];
  gameName: string;
  availability: Availability;
  preEvolution: string | null;
  siblingGames: string[];
}) {
  const other: string[] = [];
  if (preEvolution) other.push(`Evoluindo ${preEvolution}.`);
  if (availability === "outside-dex") {
    other.push(
      "Fora das Pokédex regionais: compatível com o jogo, mas obtido por transferência (Pokémon HOME), eventos ou outros métodos especiais.",
    );
  }

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: encounters.filter((e) => encounterMethodInfo(e.method).category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {groups.length === 0 ? (
        <p className="text-muted-foreground">
          A PokéAPI não registra encontros desta forma em {gameName}.
          {siblingGames.length > 0 && (
            <> Há registros em {siblingGames.join(", ")} — pode ser exclusivo daquela versão.</>
          )}
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.category} className="flex flex-col gap-2">
            <h3 className="font-semibold">{CATEGORY_LABELS[group.category]}</h3>
            <ul className="flex flex-col divide-y divide-border/60 rounded-2xl border">
              {group.items.map((e) => (
                <li key={`${e.location}-${e.method}`} className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-bold">{e.location}</span>
                    <span className="tabular text-sm text-muted-foreground">
                      {levels(e)}
                      {e.chance !== null && e.method !== "gift" && e.method !== "static"
                        ? ` · até ${e.chance}%`
                        : ""}
                    </span>
                  </div>
                  <span className="text-sm">{encounterMethodInfo(e.method).label}</span>
                  {e.conditions.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {e.conditions.join(" · ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      {other.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="font-semibold">Outras formas de obter</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {other.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Locais e chances vêm da PokéAPI e podem estar incompletos para alguns métodos.
      </p>
    </div>
  );
}
