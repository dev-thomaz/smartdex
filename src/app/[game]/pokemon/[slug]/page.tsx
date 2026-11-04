import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getGame, isGameId } from "@/features/games/config";
import { resolveEntry } from "@/features/pokedex/catalog";
import { PokemonDetailSkeleton } from "@/features/pokemon/components/pokemon-detail-skeleton";
import { PokemonDetailView } from "@/features/pokemon/components/pokemon-detail-view";
import { getPokemonDetail } from "@/features/pokemon/data";

/** Starters are prerendered at build; other Pokémon render on first visit and are then cached. */
export function generateStaticParams() {
  return ["grookey", "scorbunny", "sobble"].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[game]/pokemon/[slug]">): Promise<Metadata> {
  const { game, slug } = await params;
  if (!isGameId(game)) return {};
  const resolved = resolveEntry(getGame(game).versionGroup, decodeURIComponent(slug));
  if (!resolved) return { title: "Pokémon não encontrado" };
  return {
    title: `${resolved.entry.name} · ${getGame(game).name}`,
    description: `Golpes, evoluções, tipos e locais de ${resolved.entry.name} em ${getGame(game).name}.`,
  };
}

export default function PokemonPage({ params }: PageProps<"/[game]/pokemon/[slug]">) {
  return (
    <Suspense fallback={<PokemonDetailSkeleton />}>
      <PokemonContent params={params} />
    </Suspense>
  );
}

async function PokemonContent({ params }: { params: Promise<{ game: string; slug: string }> }) {
  const { game, slug } = await params;
  if (!isGameId(game)) notFound();
  const detail = await getPokemonDetail(game, decodeURIComponent(slug));
  if (!detail) notFound();
  return <PokemonDetailView game={game} detail={detail} />;
}
