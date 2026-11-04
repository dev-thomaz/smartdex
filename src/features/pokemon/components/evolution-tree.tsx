import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";

import { PokemonArtwork } from "@/components/pokemon/pokemon-artwork";
import type { GameId } from "@/features/games/config";
import { prettifySlug } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { EvolutionNode } from "@/types/domain";

function NodeCard({
  node,
  game,
  currentId,
}: {
  node: EvolutionNode;
  game: GameId;
  currentId: number;
}) {
  const current = node.speciesId === currentId;
  const content = (
    <>
      <PokemonArtwork pokemonId={node.speciesId} name={node.name} size={88} className="size-20" />
      <span className="text-center font-bold">{node.name}</span>
      {!node.inGame && (
        <span className="text-center text-xs text-muted-foreground">Fora deste jogo</span>
      )}
    </>
  );
  const base = "flex w-32 flex-col items-center gap-1 rounded-2xl border p-3";
  if (current) {
    return (
      <div className={cn(base, "border-primary bg-primary/5")} aria-current="page">
        {content}
      </div>
    );
  }
  if (!node.inGame) return <div className={cn(base, "border-dashed opacity-75")}>{content}</div>;
  return (
    <Link
      href={`/${game}/pokemon/${node.slug}`}
      className={cn(base, "bg-background transition-colors hover:border-foreground/30")}
    >
      {content}
    </Link>
  );
}

function Conditions({ node }: { node: EvolutionNode }) {
  if (node.methods.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">Condição não registrada para este jogo</span>
    );
  }
  return (
    <span className="flex flex-col gap-1 text-sm">
      {node.methods.map((method, i) => (
        <span key={i} className={cn("flex flex-col", i > 0 && "border-t pt-1")}>
          {i > 0 && <span className="text-xs text-muted-foreground">ou</span>}
          <span>{method.conditions.map((c) => c.text).join(", ")}</span>
          {method.recordedIn && (
            <span className="text-xs text-muted-foreground">
              Sem mudança registrada desde {prettifySlug(method.recordedIn)}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function Branch({
  node,
  game,
  currentId,
}: {
  node: EvolutionNode;
  game: GameId;
  currentId: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3 md:flex-row md:items-center">
      <NodeCard node={node} game={game} currentId={currentId} />
      {node.children.length > 0 && (
        <ul className="flex flex-col gap-4">
          {node.children.map((child) => (
            <li key={child.speciesId} className="flex flex-col items-center gap-3 md:flex-row">
              <div className="flex max-w-56 items-center gap-2 rounded-xl bg-muted px-3 py-2 md:flex-col md:items-start">
                <ArrowDown className="size-4 shrink-0 md:hidden" aria-hidden="true" />
                <ArrowRight className="hidden size-4 shrink-0 md:block" aria-hidden="true" />
                <Conditions node={child} />
              </div>
              <Branch node={child} game={game} currentId={currentId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EvolutionTree({
  root,
  game,
  currentId,
}: {
  root: EvolutionNode | null;
  game: GameId;
  currentId: number;
}) {
  if (!root || root.children.length === 0) {
    return <p className="text-muted-foreground">Este Pokémon não evolui.</p>;
  }
  return (
    <div className="overflow-x-auto pb-1">
      <Branch node={root} game={game} currentId={currentId} />
    </div>
  );
}

/** Direct pre-evolution of `speciesId` within the tree, if any. */
export function findParent(root: EvolutionNode | null, speciesId: number): EvolutionNode | null {
  if (!root) return null;
  for (const child of root.children) {
    if (child.speciesId === speciesId) return root;
    const found = findParent(child, speciesId);
    if (found) return found;
  }
  return null;
}
