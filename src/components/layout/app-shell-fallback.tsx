import { Logo } from "./logo";

/** Static placeholder shown while the game segment resolves. */
export function AppShellFallback() {
  return (
    <div className="min-h-dvh lg:pl-64" aria-busy="true">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r bg-surface px-5 py-5 lg:flex">
        <Logo />
        <div className="h-11 animate-pulse rounded-xl bg-muted" />
        <div className="h-11 animate-pulse rounded-xl bg-muted" />
      </aside>
      <div className="flex h-16 items-center border-b px-4 lg:hidden">
        <Logo />
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 pt-8 sm:grid-cols-3 md:grid-cols-4 lg:px-10 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
