/**
 * JSON backup format for SmartDex collections.
 *
 * This is SmartDex's own capture tracking — it has no relation to the
 * official Pokémon HOME collection.
 *
 * Versioning: `schemaVersion` identifies the file format. When the format
 * changes, add a new schema, bump BACKUP_SCHEMA_VERSION and extend
 * `migrateBackup` so older files keep importing.
 */

import { z } from "zod";

import { isGameId, type GameId } from "@/features/games/config";

export const BACKUP_APP_ID = "smartdex";
export const BACKUP_SCHEMA_VERSION = 1;

const speciesIdSchema = z.number().int().positive().max(100_000);

const collectionSchema = z.object({
  caught: z.array(speciesIdSchema).max(10_000),
  updatedAt: z.string().optional(),
});

const backupV1Schema = z.object({
  app: z.literal(BACKUP_APP_ID),
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  collections: z.record(z.string(), collectionSchema),
  preferences: z
    .object({
      lastGame: z.string().optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),
    })
    .optional(),
});

export type BackupV1 = z.infer<typeof backupV1Schema>;
export type Backup = BackupV1;

export interface BackupCollection {
  caught: number[];
  updatedAt: string;
}

export interface ParsedBackup {
  collections: Partial<Record<GameId, BackupCollection>>;
  preferences: BackupV1["preferences"];
  exportedAt: string;
  /** Game ids present in the file but unknown to this version of the app. */
  ignoredGames: string[];
}

export type ParseResult = { ok: true; backup: ParsedBackup } | { ok: false; error: string };

export function createBackup(input: {
  collections: Partial<Record<GameId, BackupCollection>>;
  preferences?: BackupV1["preferences"];
  now?: Date;
}): Backup {
  const collections: BackupV1["collections"] = {};
  for (const [gameId, collection] of Object.entries(input.collections)) {
    if (!collection) continue;
    collections[gameId] = {
      caught: [...new Set(collection.caught)].sort((a, b) => a - b),
      updatedAt: collection.updatedAt,
    };
  }
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: (input.now ?? new Date()).toISOString(),
    collections,
    preferences: input.preferences,
  };
}

/** Upgrades any supported older format to the current one. */
function migrateBackup(data: unknown): unknown {
  // Only v1 exists today. Future: if (version === 1) data = v1ToV2(data).
  return data;
}

export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "O arquivo não é um JSON válido." };
  }

  if (
    typeof json !== "object" ||
    json === null ||
    (json as { app?: unknown }).app !== BACKUP_APP_ID
  ) {
    return { ok: false, error: "Este arquivo não é um backup do SmartDex." };
  }

  const version = (json as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version !== "number" || version > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: "Este backup foi criado por uma versão mais nova do SmartDex.",
    };
  }

  const result = backupV1Schema.safeParse(migrateBackup(json));
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue?.path.length ? ` (campo ${issue.path.join(".")})` : "";
    return { ok: false, error: `Backup inválido${where}.` };
  }

  const collections: ParsedBackup["collections"] = {};
  const ignoredGames: string[] = [];
  for (const [gameId, collection] of Object.entries(result.data.collections)) {
    if (!isGameId(gameId)) {
      ignoredGames.push(gameId);
      continue;
    }
    collections[gameId] = {
      caught: [...new Set(collection.caught)].sort((a, b) => a - b),
      updatedAt: collection.updatedAt ?? result.data.exportedAt,
    };
  }

  return {
    ok: true,
    backup: {
      collections,
      preferences: result.data.preferences,
      exportedAt: result.data.exportedAt,
      ignoredGames,
    },
  };
}

export function backupFileName(now = new Date()): string {
  return `smartdex-backup-${now.toISOString().slice(0, 10)}.json`;
}
