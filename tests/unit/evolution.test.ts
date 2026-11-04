import { describe, expect, it } from "vitest";

import {
  adaptEvolutionChain,
  describeEvolutionDetail,
  selectEvolutionDetails,
  type EvolutionContext,
} from "@/lib/api/pokeapi/adapters";
import type { RawChainLink, RawEvolutionDetail } from "@/lib/api/pokeapi/schemas";

const ORDER: Record<string, number> = {
  "red-blue": 1,
  "gold-silver": 3,
  "diamond-pearl": 8,
  "x-y": 15,
  "sun-moon": 19,
  "sword-shield": 22,
  "the-isle-of-armor": 23,
  "the-crown-tundra": 24,
  "scarlet-violet": 27,
};

const ctx: EvolutionContext = {
  versionGroups: ["sword-shield", "the-isle-of-armor", "the-crown-tundra"],
  versionGroupOrder: ORDER,
  inGame: (id) => id !== 172,
  speciesName: (_id, slug) => slug.charAt(0).toUpperCase() + slug.slice(1),
  moveName: (slug) => (slug === "rollout" ? "Rollout" : slug),
};

const res = (name: string, id = 1) => ({ name, url: `https://pokeapi.co/api/v2/x/${id}/` });

type DetailInput = Omit<Partial<RawEvolutionDetail>, "trigger" | "version_group"> & {
  trigger: string;
  vg?: string;
};

function d({ trigger, vg, ...rest }: DetailInput): RawEvolutionDetail {
  return { trigger: res(trigger), version_group: vg ? res(vg) : null, ...rest };
}

const texts = (detail: RawEvolutionDetail) =>
  describeEvolutionDetail(detail, ctx).map((c) => c.text);

describe("selectEvolutionDetails", () => {
  it("prefers the game's own record over older ones (Leafeon: Leaf Stone in Gen VIII)", () => {
    const details = [
      d({ trigger: "level-up", vg: "diamond-pearl", location: res("eterna-forest") }),
      d({ trigger: "level-up", vg: "sun-moon", location: res("lush-jungle") }),
      d({ trigger: "use-item", vg: "sword-shield", item: res("leaf-stone") }),
    ];
    const selected = selectEvolutionDetails(details, ctx);
    expect(selected).toHaveLength(1);
    expect(texts(selected[0].detail)).toEqual(["Usar Leaf Stone"]);
    expect(selected[0].recordedIn).toBeNull();
  });

  it("falls back to the latest earlier record and flags its origin (Vaporeon)", () => {
    const selected = selectEvolutionDetails(
      [d({ trigger: "use-item", vg: "red-blue", item: res("water-stone") })],
      ctx,
    );
    expect(selected[0].recordedIn).toBe("red-blue");
  });

  it("ignores records from later games", () => {
    const selected = selectEvolutionDetails(
      [
        d({ trigger: "level-up", vg: "x-y", min_affection: 2, known_move_type: res("fairy") }),
        d({ trigger: "level-up", vg: "scarlet-violet", min_level: 99 }),
      ],
      ctx,
    );
    expect(selected.map((s) => s.detail.version_group?.name)).toEqual(["x-y"]);
  });

  it("chooses independently per regional form (Meowth → Persian)", () => {
    const selected = selectEvolutionDetails(
      [
        d({
          trigger: "level-up",
          vg: "red-blue",
          min_level: 28,
          required_pokemon_form: res("meowth"),
        }),
        d({
          trigger: "level-up",
          vg: "sun-moon",
          min_happiness: 160,
          required_pokemon_form: res("meowth-alola"),
        }),
      ],
      ctx,
    );
    expect(selected.map((s) => texts(s.detail).join(", "))).toEqual([
      "Nível 28",
      "Subir de nível, amizade alta (≥ 160), a partir da forma Alola",
    ]);
  });
});

describe("describeEvolutionDetail", () => {
  it("translates common conditions into readable Portuguese", () => {
    expect(texts(d({ trigger: "level-up", min_level: 16 }))).toEqual(["Nível 16"]);
    expect(texts(d({ trigger: "level-up", min_happiness: 160, time_of_day: "night" }))).toEqual([
      "Subir de nível",
      "amizade alta (≥ 160)",
      "à noite",
    ]);
    expect(texts(d({ trigger: "trade", held_item: res("metal-coat") }))).toEqual([
      "Troca",
      "segurando Metal Coat",
    ]);
    expect(texts(d({ trigger: "level-up", known_move: res("rollout") }))).toEqual([
      "Subir de nível",
      "conhecendo Rollout",
    ]);
    expect(texts(d({ trigger: "three-critical-hits" }))).toEqual([
      "Acertar 3 golpes críticos na mesma batalha",
    ]);
    expect(texts(d({ trigger: "level-up", min_level: 20, relative_physical_stats: 1 }))).toEqual([
      "Nível 20",
      "com Ataque maior que Defesa",
    ]);
  });
});

describe("adaptEvolutionChain", () => {
  const chain: RawChainLink = {
    species: res("pichu", 172),
    evolution_details: [],
    evolves_to: [
      {
        species: res("pikachu", 25),
        evolution_details: [d({ trigger: "level-up", vg: "gold-silver", min_happiness: 220 })],
        evolves_to: [
          {
            species: res("raichu", 26),
            evolution_details: [
              d({ trigger: "use-item", vg: "red-blue", item: res("thunder-stone") }),
            ],
            evolves_to: [],
          },
        ],
      },
    ],
  };

  it("builds a tree with methods, ids and availability", () => {
    const root = adaptEvolutionChain(chain, ctx);
    expect(root).toMatchObject({ speciesId: 172, name: "Pichu", inGame: false, methods: [] });
    const pikachu = root.children[0];
    expect(pikachu.speciesId).toBe(25);
    expect(pikachu.methods[0].conditions.map((c) => c.text)).toEqual([
      "Subir de nível",
      "amizade alta (≥ 220)",
    ]);
    expect(pikachu.children[0].methods[0].conditions[0].text).toBe("Usar Thunder Stone");
  });
});
