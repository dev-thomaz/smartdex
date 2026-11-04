"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { officialArtworkUrl } from "@/lib/api/pokeapi/artwork";

interface PokemonArtworkProps {
  pokemonId: number;
  name: string;
  size: number;
  /** `sizes` attribute for responsive images. */
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/** Official artwork with a quiet placeholder if the image is missing. */
export function PokemonArtwork({
  pokemonId,
  name,
  size,
  sizes,
  priority,
  className,
}: PokemonArtworkProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        role="img"
        aria-label={`Arte de ${name} indisponível`}
        className={cn(
          "grid place-items-center rounded-full bg-muted text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }
  return (
    <Image
      src={officialArtworkUrl(pokemonId)}
      alt={name}
      width={size}
      height={size}
      sizes={sizes ?? `${size}px`}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
    />
  );
}
