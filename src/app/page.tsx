import { HomeEntry } from "@/features/library/components/home-entry";
import { getLibraryCards } from "@/features/library/library";

/** First visit: the game library. Later visits: reopen the last Pokédex. */
export default function HomePage() {
  return <HomeEntry cards={getLibraryCards()} />;
}
