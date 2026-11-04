/**
 * Minimal PokéAPI REST client (server side). Responses are validated with
 * Zod; caching is applied one level up with `"use cache"`.
 */

import type { z } from "zod";

export const POKEAPI_REST = "https://pokeapi.co/api/v2";

export class PokeApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "PokeApiError";
  }
}

export class PokeApiNotFoundError extends PokeApiError {
  constructor(path: string) {
    super(`PokéAPI resource not found: ${path}`, 404);
    this.name = "PokeApiNotFoundError";
  }
}

export async function fetchPokeApi<T extends z.ZodType>(
  pathOrUrl: string,
  schema: T,
  attempt = 1,
): Promise<z.infer<T>> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${POKEAPI_REST}/${pathOrUrl}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (attempt < 3) return fetchPokeApi(pathOrUrl, schema, attempt + 1);
    throw new PokeApiError(`PokéAPI request failed: ${String(error)}`, null);
  }
  if (res.status === 404) throw new PokeApiNotFoundError(pathOrUrl);
  if (!res.ok) {
    if (res.status >= 500 && attempt < 3) return fetchPokeApi(pathOrUrl, schema, attempt + 1);
    throw new PokeApiError(`PokéAPI responded ${res.status} for ${pathOrUrl}`, res.status);
  }
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) {
    throw new PokeApiError(
      `Unexpected PokéAPI shape for ${pathOrUrl}: ${parsed.error.message}`,
      null,
    );
  }
  return parsed.data;
}
