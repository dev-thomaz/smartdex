import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";

import { closeDB, readAllCollections } from "@/lib/storage/db";
import { resetCollectionStore, useCollectionStore } from "@/stores/collection-store";

const store = () => useCollectionStore.getState();

beforeEach(async () => {
  await closeDB();
  globalThis.indexedDB = new IDBFactory();
  resetCollectionStore();
});

/** Simulates closing and reopening the browser: memory is lost, IndexedDB stays. */
async function reopen() {
  await closeDB();
  resetCollectionStore();
  await store().hydrate();
}

describe("collection persistence", () => {
  it("persists caught species across reloads", async () => {
    await store().toggle("sword", 810);
    await store().toggle("sword", 813);
    await reopen();
    expect([...(store().caught.sword ?? [])].sort()).toEqual([810, 813]);
    expect(store().status).toBe("ready");
  });

  it("unmarks a species", async () => {
    await store().toggle("sword", 810);
    await store().toggle("sword", 810);
    await reopen();
    expect(store().caught.sword?.has(810)).toBe(false);
  });

  it("keeps progress independent per game", async () => {
    await store().setCaught("sword", 25, true);
    await store().setCaught("shield", 133, true);
    await reopen();
    expect([...(store().caught.sword ?? [])]).toEqual([25]);
    expect([...(store().caught.shield ?? [])]).toEqual([133]);
  });

  it("never overwrites stored data when toggling before hydration finished", async () => {
    await store().setCaught("sword", 1, true);
    await closeDB();
    resetCollectionStore(); // fresh page, not hydrated yet
    await store().setCaught("sword", 2, true);
    const stored = await readAllCollections();
    expect(stored.find((c) => c.gameId === "sword")?.caught.sort()).toEqual([1, 2]);
  });
});

describe("import", () => {
  it("merges with existing progress", async () => {
    await store().setCaught("sword", 1, true);
    await store().importCollections({ sword: { caught: [2, 3], updatedAt: "x" } }, "merge");
    await reopen();
    expect([...(store().caught.sword ?? [])].sort()).toEqual([1, 2, 3]);
  });

  it("replaces only the games in the backup", async () => {
    await store().setCaught("sword", 1, true);
    await store().setCaught("shield", 9, true);
    await store().importCollections({ sword: { caught: [5], updatedAt: "x" } }, "replace");
    await reopen();
    expect([...(store().caught.sword ?? [])]).toEqual([5]);
    expect([...(store().caught.shield ?? [])]).toEqual([9]);
  });

  it("exports a snapshot that can be imported again", async () => {
    await store().setCaught("shield", 7, true);
    const snapshot = store().snapshot();
    expect(snapshot.shield?.caught).toEqual([7]);
  });
});

describe("independent progress across versions", () => {
  it("catching in FireRed does not mark LeafGreen", async () => {
    await store().setCaught("firered", 6, true);
    await reopen();
    expect(store().caught.firered?.has(6)).toBe(true);
    expect(store().caught.leafgreen?.has(6) ?? false).toBe(false);
  });

  it("import keeps each game's progress separate", async () => {
    await store().importCollections(
      { firered: { caught: [1, 2], updatedAt: "x" }, leafgreen: { caught: [3], updatedAt: "x" } },
      "replace",
    );
    await reopen();
    expect([...(store().caught.firered ?? [])].sort()).toEqual([1, 2]);
    expect([...(store().caught.leafgreen ?? [])]).toEqual([3]);
  });
});
