/**
 * IndexedDB persistence (client only).
 *
 * Schema history — bump DB_VERSION and add a branch to `upgrade` for every
 * structural change; never edit an existing branch.
 *   v1: `collections` (keyPath gameId) and `preferences` (out-of-line keys).
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export const DB_NAME = "smartdex";
export const DB_VERSION = 1;

export interface StoredCollection {
  gameId: string;
  /** National Pokédex numbers (species ids) marked as caught. */
  caught: number[];
  updatedAt: string;
}

export interface SmartDexDB extends DBSchema {
  collections: { key: string; value: StoredCollection };
  preferences: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<SmartDexDB>> | null = null;

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export function getDB(): Promise<IDBPDatabase<SmartDexDB>> {
  if (!isStorageAvailable()) {
    return Promise.reject(new Error("IndexedDB indisponível neste navegador."));
  }
  dbPromise ??= openDB<SmartDexDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("collections", { keyPath: "gameId" });
        db.createObjectStore("preferences");
      }
    },
  }).catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

/** Test helper: forget the cached connection. */
export async function closeDB(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise.catch(() => null);
  db?.close();
  dbPromise = null;
}

export async function readAllCollections(): Promise<StoredCollection[]> {
  const db = await getDB();
  return db.getAll("collections");
}

export async function writeCollection(collection: StoredCollection): Promise<void> {
  const db = await getDB();
  await db.put("collections", collection);
}

export async function writeCollections(collections: StoredCollection[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("collections", "readwrite");
  await Promise.all([...collections.map((c) => tx.store.put(c)), tx.done]);
}

export async function readPreference<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get("preferences", key)) as T | undefined;
}

export async function writePreference(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("preferences", value, key);
}
