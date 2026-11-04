import Link from "next/link";

import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <Logo />
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">
        Este Pokémon ou página não existe no jogo selecionado.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
      >
        Voltar à Pokédex
      </Link>
    </main>
  );
}
