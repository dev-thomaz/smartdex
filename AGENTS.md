<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## SmartDex — project rules

- Run every command inside this folder with **Node 22** (`.nvmrc`) and **pnpm**. Next 16 does not run on Node 18.
- Before finishing a change: `pnpm check` (typecheck + lint + tests) and `pnpm build`. Stop `pnpm dev` before `pnpm build` — they share `.next/`.
- **Game-specific logic lives only in `src/features/games/config.ts`.** Never branch on a game id inside components.
- **UI never reads raw PokéAPI JSON.** Fetch in `src/features/pokemon/data.ts` (server, `"use cache"`), validate with the Zod schemas in `src/lib/api/pokeapi/schemas.ts`, convert with the pure adapters in `src/lib/api/pokeapi/adapters.ts`, and render the types from `src/types/domain.ts`.
- **Never mix generations.** Learnsets are filtered by the game's version groups; move values, types, stats and the type chart are resolved for the game's generation (`src/lib/api/pokeapi/resolve.ts`).
- **Never invent Pokémon data.** If PokéAPI lacks something, show that it is missing.
- Catalog data in `src/data/generated/` (catalogs, `library.json` with measured coverage, the `catalogs.ts` registry) is produced by `pnpm data:generate`; do not hand-edit it. Adding a game = config entry + regenerate.
- Progress totals always come from a validated dex (`catalog.dexes[].size` / `library.json`), never from summing dexes or counting a generation. Collections are keyed by game id and store species ids.
- Show PokéAPI gaps through `GameDataCoverage` (`src/features/library/coverage.ts`); never mark a game as complete or fill a gap with another game's data silently.
- Persistence: bump `DB_VERSION` in `src/lib/storage/db.ts` and add an `upgrade` branch for schema changes; bump `BACKUP_SCHEMA_VERSION` and extend `migrateBackup` for backup format changes.
- With Cache Components, read `params` inside `<Suspense>` (see `src/app/[game]/layout.tsx`) and keep `generateMetadata` free of `params` on fully static routes.
- UI copy is pt-BR; Pokémon, move, ability and item names stay in English (as in the games).
- Accessibility baseline: WCAG 2.2 AA contrast, 44px touch targets, visible focus, labels on icon buttons, no information hidden on mobile.
- Planning notes, research and scratch work belong in the parent `pokedex/` folder, not in this repo.
