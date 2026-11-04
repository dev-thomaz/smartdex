import type { Metadata } from "next";

import { SettingsView } from "@/features/collection/components/settings-view";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return <SettingsView />;
}
