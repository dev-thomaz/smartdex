import { describe, expect, it } from "vitest";

import { getCatalog, getMoveIndex, getNeighbors, resolveEntry } from "@/features/pokedex/catalog";

const catalog = getCatalog("sword-shield");
const bySlug = (slug: string) => catalog.entries.find((e) => e.slug === slug);

describe("generated Sword/Shield catalog", () => {
  it("has the regional and DLC dex sizes", () => {
    const count = (dex: string) => catalog.entries.filter((e) => e.dex[dex] !== undefined).length;
    expect(count("galar")).toBe(400);
    expect(count("isle-of-armor")).toBe(211);
    expect(count("crown-tundra")).toBe(210);
  });

  it("never mixes availability categories", () => {
    for (const e of catalog.entries) {
      const dexes = Object.keys(e.dex);
      if (e.availability === "regional") expect(dexes).toContain("galar");
      if (e.availability === "dlc") expect(dexes.length > 0 && !dexes.includes("galar")).toBe(true);
      if (e.availability === "outside-dex") expect(dexes).toEqual([]);
    }
  });

  it("classifies known species correctly", () => {
    expect(bySlug("grookey")?.availability).toBe("regional");
    expect(bySlug("kubfu")?.availability).toBe("dlc");
    expect(bySlug("calyrex")?.availability).toBe("dlc");
    expect(bySlug("mew")?.availability).toBe("outside-dex");
    expect(bySlug("bulbasaur")?.availability).toBe("dlc");
    // Not in Sword/Shield at all ("Dexit").
    expect(bySlug("chikorita")).toBeUndefined();
  });

  it("shows Galarian forms on cards", () => {
    expect(bySlug("meowth")).toMatchObject({ types: ["steel"], artId: 10161 });
    expect(resolveEntry("sword-shield", "meowth-galar")?.form.slug).toBe("meowth-galar");
    expect(resolveEntry("sword-shield", "meowth")?.form.slug).toBe("meowth-galar");
    expect(resolveEntry("sword-shield", "not-a-pokemon")).toBeNull();
  });

  it("maps TMs and TRs of the game", () => {
    const { machines, moves } = getMoveIndex("sword-shield");
    expect(Object.keys(machines)).toHaveLength(200);
    expect(machines["53"]).toBe("TR02"); // Flamethrower
    expect(moves["53"]).toMatchObject({ power: 90, pp: 15 });
  });

  it("finds neighbors in the regional dex", () => {
    const n = getNeighbors("sword-shield", ["galar", "isle-of-armor", "crown-tundra"], 811);
    expect(n.previous?.slug).toBe("grookey");
    expect(n.next?.slug).toBe("rillaboom");
  });
});
