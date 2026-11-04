import type { Metadata } from "next";

import { PokedexView } from "@/features/pokedex/components/pokedex-view";

export const metadata: Metadata = { title: "Pokédex" };

/** The game comes from the layout's CatalogProvider, so no params are awaited here. */
export default function PokedexPage() {
  return <PokedexView />;
}
