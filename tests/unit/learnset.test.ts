import { describe, expect, it } from "vitest";

import { buildMoveTabs } from "@/features/pokemon/components/moves-panel";
import { adaptLearnset } from "@/lib/api/pokeapi/adapters";
import type { RawPokemon } from "@/lib/api/pokeapi/schemas";
import type { MoveIndex } from "@/types/domain";

const VG = ["sword-shield", "the-isle-of-armor", "the-crown-tundra"];

const moveIndex: MoveIndex = {
  schemaVersion: 1,
  versionGroup: "sword-shield",
  generatedAt: "",
  moves: {
    "33": {
      id: 33,
      slug: "tackle",
      name: "Tackle",
      type: "normal",
      category: "physical",
      power: 40,
      accuracy: 100,
      pp: 35,
    },
    "53": {
      id: 53,
      slug: "flamethrower",
      name: "Flamethrower",
      type: "fire",
      category: "special",
      power: 90,
      accuracy: 100,
      pp: 15,
    },
    "52": {
      id: 52,
      slug: "ember",
      name: "Ember",
      type: "fire",
      category: "special",
      power: 40,
      accuracy: 100,
      pp: 25,
    },
    "263": {
      id: 263,
      slug: "facade",
      name: "Facade",
      type: "normal",
      category: "physical",
      power: 70,
      accuracy: 100,
      pp: 20,
    },
    "394": {
      id: 394,
      slug: "flare-blitz",
      name: "Flare Blitz",
      type: "fire",
      category: "physical",
      power: 120,
      accuracy: 100,
      pp: 15,
    },
  },
  machines: { "53": "TR02", "263": "TM24" },
};

function detail(vg: string, method: string, level = 0) {
  return {
    level_learned_at: level,
    move_learn_method: { name: method, url: "" },
    version_group: { name: vg, url: "" },
  };
}

function move(
  id: number,
  slug: string,
  details: ReturnType<typeof detail>[],
): RawPokemon["moves"][number] {
  return {
    move: { name: slug, url: `https://pokeapi.co/api/v2/move/${id}/` },
    version_group_details: details,
  };
}

const raw: RawPokemon["moves"] = [
  move(33, "tackle", [detail("sword-shield", "level-up", 1), detail("red-blue", "level-up", 1)]),
  move(52, "ember", [detail("sword-shield", "level-up", 8), detail("sun-moon", "level-up", 4)]),
  move(53, "flamethrower", [detail("sword-shield", "machine"), detail("red-blue", "machine")]),
  move(263, "facade", [detail("sword-shield", "machine")]),
  // Only learnable in older games — must never leak into Sword/Shield.
  move(999, "old-move", [detail("x-y", "tutor")]),
  move(394, "flare-blitz", [detail("sword-shield", "egg"), detail("sword-shield", "egg")]),
];

describe("adaptLearnset", () => {
  const learnset = adaptLearnset(raw, { versionGroups: VG, moveIndex });

  it("keeps only moves of the game's version groups", () => {
    expect(learnset.map((m) => m.move.slug).sort()).toEqual([
      "ember",
      "facade",
      "flamethrower",
      "flare-blitz",
      "tackle",
    ]);
  });

  it("uses the level of the game, not of older games", () => {
    expect(learnset.find((m) => m.move.slug === "ember")?.level).toBe(8);
  });

  it("labels machines as TM or TR for the game", () => {
    const flamethrower = learnset.find((m) => m.move.slug === "flamethrower");
    expect(flamethrower).toMatchObject({ method: "machine", machine: "TR02", machineKind: "TR" });
    expect(learnset.find((m) => m.move.slug === "facade")).toMatchObject({
      machine: "TM24",
      machineKind: "TM",
    });
  });

  it("removes duplicated entries", () => {
    expect(learnset.filter((m) => m.move.slug === "flare-blitz")).toHaveLength(1);
  });

  it("sorts level-up moves by level", () => {
    const levels = learnset.filter((m) => m.method === "level-up").map((m) => m.level);
    expect(levels).toEqual([1, 8]);
  });

  it("returns nothing for a game with no data", () => {
    expect(adaptLearnset(raw, { versionGroups: ["scarlet-violet"], moveIndex })).toEqual([]);
  });
});

describe("buildMoveTabs", () => {
  it("separates level-up, TM, TR and egg moves, skipping empty tabs", () => {
    const tabs = buildMoveTabs(adaptLearnset(raw, { versionGroups: VG, moveIndex }));
    expect(tabs.map((t) => [t.label, t.moves.length])).toEqual([
      ["Por nível", 2],
      ["TM", 1],
      ["TR", 1],
      ["Egg Moves", 1],
    ]);
  });
});
