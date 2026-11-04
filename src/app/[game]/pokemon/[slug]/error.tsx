"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function PokemonError({ error, retry }: { error: unknown; retry: () => void }) {
  const params = useParams<{ game: string }>();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-3xl border bg-card px-6 py-14 text-center"
    >
      <h1 className="text-xl font-bold">Não foi possível carregar este Pokémon</h1>
      <p className="max-w-md text-muted-foreground">
        A PokéAPI pode estar indisponível ou lenta no momento. Seu progresso não foi afetado.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="h-11 gap-2 rounded-xl" onClick={() => retry()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Tentar de novo
        </Button>
        <Button variant="outline" className="h-11 rounded-xl" asChild>
          <Link href={`/${params.game}`}>Voltar à Pokédex</Link>
        </Button>
      </div>
    </div>
  );
}
