import type { Metadata } from "next";

import { ProgressOverview } from "@/features/collection/components/progress-overview";

export const metadata: Metadata = { title: "Progresso" };

export default function ProgressPage() {
  return <ProgressOverview />;
}
