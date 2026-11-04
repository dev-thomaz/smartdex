import { describe, expect, it } from "vitest";

import { backupFileName, createBackup, parseBackup } from "@/features/collection/backup";

const now = new Date("2026-11-04T12:00:00.000Z");

describe("createBackup", () => {
  it("writes a versioned, deduplicated and sorted file", () => {
    const backup = createBackup({
      collections: { sword: { caught: [813, 810, 810], updatedAt: "2026-11-01T00:00:00.000Z" } },
      preferences: { lastGame: "sword", theme: "dark" },
      now,
    });
    expect(backup).toEqual({
      app: "smartdex",
      schemaVersion: 1,
      exportedAt: "2026-11-04T12:00:00.000Z",
      collections: { sword: { caught: [810, 813], updatedAt: "2026-11-01T00:00:00.000Z" } },
      preferences: { lastGame: "sword", theme: "dark" },
    });
    expect(backupFileName(now)).toBe("smartdex-backup-2026-11-04.json");
  });
});

describe("parseBackup", () => {
  it("round-trips an exported backup", () => {
    const text = JSON.stringify(
      createBackup({ collections: { shield: { caught: [1, 2], updatedAt: "x" } }, now }),
    );
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.collections.shield?.caught).toEqual([1, 2]);
      expect(result.backup.ignoredGames).toEqual([]);
    }
  });

  it("rejects invalid JSON and files from other apps", () => {
    expect(parseBackup("{not json")).toEqual({
      ok: false,
      error: "O arquivo não é um JSON válido.",
    });
    expect(parseBackup(JSON.stringify({ hello: "world" }))).toMatchObject({ ok: false });
  });

  it("rejects files from a newer schema version", () => {
    const text = JSON.stringify({
      app: "smartdex",
      schemaVersion: 99,
      exportedAt: "",
      collections: {},
    });
    expect(parseBackup(text)).toMatchObject({
      ok: false,
      error: expect.stringContaining("mais nova"),
    });
  });

  it("rejects invalid species ids with the failing field", () => {
    const text = JSON.stringify({
      app: "smartdex",
      schemaVersion: 1,
      exportedAt: "2026-01-01",
      collections: { sword: { caught: [1, -5] } },
    });
    expect(parseBackup(text)).toMatchObject({
      ok: false,
      error: expect.stringContaining("collections.sword.caught"),
    });
  });

  it("ignores games this version does not know", () => {
    const text = JSON.stringify({
      app: "smartdex",
      schemaVersion: 1,
      exportedAt: "2026-01-01",
      collections: { sword: { caught: [25] }, "pokemon-champions": { caught: [1] } },
    });
    const result = parseBackup(text);
    expect(result).toMatchObject({ ok: true, backup: { ignoredGames: ["pokemon-champions"] } });
    if (result.ok) expect(result.backup.collections.sword?.updatedAt).toBe("2026-01-01");
  });
});
