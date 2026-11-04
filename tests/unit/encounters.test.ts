import { describe, expect, it } from "vitest";

import {
  adaptEncounters,
  describeCondition,
  describeLocationArea,
} from "@/lib/api/pokeapi/adapters";
import type { RawEncounters } from "@/lib/api/pokeapi/schemas";

const r = (name: string) => ({ name, url: "" });

const raw: RawEncounters = [
  {
    location_area: r("galar-route-4-area"),
    version_details: [
      {
        version: r("sword"),
        encounter_details: [
          {
            min_level: 14,
            max_level: 16,
            chance: 10,
            method: r("overworld"),
            condition_values: [r("weather-normal")],
          },
          {
            min_level: 13,
            max_level: 17,
            chance: 25,
            method: r("overworld"),
            condition_values: [r("weather-raining")],
          },
        ],
      },
      {
        version: r("red"),
        encounter_details: [
          { min_level: 2, max_level: 3, chance: 50, method: r("walk"), condition_values: [] },
        ],
      },
    ],
  },
  {
    location_area: r("rolling-fields-max-den-a"),
    version_details: [
      {
        version: r("shield"),
        encounter_details: [
          {
            min_level: 15,
            max_level: 20,
            chance: 10,
            method: r("max-raid"),
            condition_values: [r("max-den-rating-1-star")],
          },
        ],
      },
    ],
  },
];

describe("adaptEncounters", () => {
  it("keeps only the selected game's versions", () => {
    const sword = adaptEncounters(raw, { versions: ["sword"], region: "galar" });
    expect(sword.map((e) => e.location)).toEqual(["Route 4"]);
    const shield = adaptEncounters(raw, { versions: ["shield"], region: "galar" });
    expect(shield.map((e) => e.location)).toEqual(["Rolling Fields"]);
  });

  it("merges weather variants of the same location and method", () => {
    const [route] = adaptEncounters(raw, { versions: ["sword"], region: "galar" });
    expect(route).toMatchObject({ minLevel: 13, maxLevel: 17, chance: 25 });
    expect(route.conditions).toEqual(["Chuva", "Clima normal"]);
  });

  it("names Max Raid dens", () => {
    const [den] = adaptEncounters(raw, { versions: ["shield"], region: "galar" });
    expect(den.conditions).toEqual(["Toca A", "1★"]);
  });
});

describe("location and condition labels", () => {
  it("cleans PokéAPI slugs", () => {
    expect(describeLocationArea("galar-route-1-area", "galar")).toEqual({
      location: "Route 1",
      spot: null,
    });
    expect(describeLocationArea("giants-bed-max-den-k", "galar")).toEqual({
      location: "Giants Bed",
      spot: "Toca K",
    });
    expect(describeCondition("weather-snowstorm")).toBe("Nevasca");
    expect(describeCondition("story-progress-hall-of-fame")).toBe("Progresso: Hall Of Fame");
  });
});
