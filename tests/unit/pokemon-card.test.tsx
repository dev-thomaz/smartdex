// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CardEntry } from "@/features/pokedex/catalog-context";
import { PokemonCard } from "@/features/pokedex/components/pokemon-card";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

const eevee: CardEntry = {
  id: 133,
  slug: "eevee",
  name: "Eevee",
  types: ["normal"],
  artId: 133,
  dex: { galar: 196 },
  availability: "regional",
  legendary: false,
  mythical: false,
};

afterEach(cleanup);

function renderCard(caught: boolean, onToggle = vi.fn()) {
  render(
    <ul>
      <PokemonCard game="sword" entry={eevee} number={196} caught={caught} onToggle={onToggle} />
    </ul>,
  );
  return onToggle;
}

describe("PokemonCard", () => {
  it("shows number, name, type and links to the detail page of the game", () => {
    renderCard(false);
    expect(screen.getByText("#196")).toBeTruthy();
    expect(screen.getByText("Normal")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/sword/pokemon/eevee");
  });

  it("toggles capture directly from the card without navigating", async () => {
    const onToggle = renderCard(false);
    const button = screen.getByRole("button", { name: "Marcar Eevee como capturado" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(133);
  });

  it("announces the caught state", () => {
    renderCard(true);
    const button = screen.getByRole("button", { name: "Desmarcar Eevee como capturado" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });
});
