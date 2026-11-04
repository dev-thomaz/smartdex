import { TypeBadge } from "@/components/pokemon/type-badge";
import { mechanicsFor } from "@/features/games/config";
import type { TypeName } from "@/types/domain";

import {
  defensiveProfile,
  formatMultiplier,
  getTypeChart,
  type Matchup,
} from "../type-effectiveness";

function Group({ title, items, empty }: { title: string; items: Matchup[]; empty: string }) {
  const byMultiplier = new Map<number, TypeName[]>();
  for (const item of items) {
    byMultiplier.set(item.multiplier, [...(byMultiplier.get(item.multiplier) ?? []), item.type]);
  }
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...byMultiplier.entries()].map(([multiplier, types]) => (
            <li key={multiplier} className="flex items-start gap-3">
              <span className="tabular mt-0.5 w-9 shrink-0 text-sm font-bold">
                {formatMultiplier(multiplier)}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {types.map((type) => (
                  <TypeBadge key={type} type={type} size="sm" />
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TypeMatchups({ types, generation }: { types: TypeName[]; generation: number }) {
  const profile = defensiveProfile(types, getTypeChart(generation));
  return (
    <div className="flex flex-col gap-5">
      <Group title="Fraco contra" items={profile.weaknesses} empty="Nenhuma fraqueza." />
      <Group title="Resistente a" items={profile.resistances} empty="Nenhuma resistência." />
      <Group title="Imune a" items={profile.immunities} empty="Nenhuma imunidade." />
      <p className="text-xs text-muted-foreground">
        Dano recebido de golpes de cada tipo, pela tabela da Geração {generation}.
        {mechanicsFor(generation).abilities &&
          " Habilidades (como Levitate) podem alterar estes valores."}
      </p>
    </div>
  );
}
