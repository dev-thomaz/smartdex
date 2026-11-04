// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameLibrary } from "@/features/library/components/game-library";
import { getLibraryCards } from "@/features/library/library";
import { closeDB } from "@/lib/storage/db";
import { resetCollectionStore, useCollectionStore } from "@/stores/collection-store";

vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", resolvedTheme: "light", setTheme: vi.fn() }),
}));

beforeEach(async () => {
  await closeDB();
  globalThis.indexedDB = new IDBFactory();
  resetCollectionStore();
  await useCollectionStore.getState().hydrate();
});
afterEach(cleanup);

const cardFor = (name: string) =>
  screen.getByRole("link", { name: new RegExp(`^Pokémon ${name}`) });

describe("GameLibrary", () => {
  it("shows every game as a link to its Pokédex with 0 / total progress", () => {
    render(<GameLibrary cards={getLibraryCards()} />);
    const firered = cardFor("FireRed");
    expect(firered.getAttribute("href")).toBe("/firered");
    expect(within(firered).getByText("/ 151 Pokémon")).toBeTruthy();
    expect(within(firered).getByRole("progressbar").getAttribute("aria-valuetext")).toBe(
      "0 de 151 obtidos",
    );
    expect(screen.getByRole("heading", { name: /Geração I\b/ })).toBeTruthy();
  });

  it("updates a card when a Pokémon is caught, without touching its sibling", async () => {
    render(<GameLibrary cards={getLibraryCards()} />);
    await act(() => useCollectionStore.getState().setCaught("firered", 1, true));
    expect(within(cardFor("FireRed")).getByRole("progressbar").getAttribute("aria-valuetext")).toBe(
      "1 de 151 obtidos",
    );
    expect(
      within(cardFor("LeafGreen")).getByRole("progressbar").getAttribute("aria-valuetext"),
    ).toBe("0 de 151 obtidos");
  });

  it("filters instantly by name and by generation", async () => {
    render(<GameLibrary cards={getLibraryCards()} />);
    await userEvent.type(screen.getByLabelText("Buscar jogo pelo nome"), "sword");
    expect(await screen.findByText("1 jogo")).toBeTruthy();
    await userEvent.clear(screen.getByLabelText("Buscar jogo pelo nome"));
    await userEvent.click(screen.getByRole("radio", { name: "Ger. IX" }));
    expect(await screen.findByText("3 jogos")).toBeTruthy();
  });
});
