export function PokemonDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando Pokémon…
      </span>
      <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-6 rounded-3xl border bg-card p-6 md:grid-cols-[16rem_1fr]">
        <div className="mx-auto size-56 animate-pulse rounded-full bg-muted" />
        <div className="flex flex-col gap-4">
          <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-56 animate-pulse rounded bg-muted" />
          <div className="h-7 w-40 animate-pulse rounded-full bg-muted" />
          <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-muted" />
    </div>
  );
}
