import { STAT_LABELS } from "@/lib/labels";
import type { StatValue } from "@/types/domain";

/** Highest base stat in the games (Blissey's HP); bars use it as the scale. */
const MAX_STAT = 255;

function barColor(value: number): string {
  if (value < 50) return "oklch(0.62 0.17 30)";
  if (value < 80) return "oklch(0.75 0.15 75)";
  if (value < 110) return "oklch(0.68 0.15 140)";
  return "oklch(0.62 0.13 185)";
}

export function StatsPanel({ stats }: { stats: StatValue[] }) {
  const total = stats.reduce((sum, s) => sum + s.value, 0);
  return (
    <dl className="flex flex-col gap-3">
      {stats.map((stat) => (
        <div key={stat.key} className="grid grid-cols-[7.5rem_2.75rem_1fr] items-center gap-3">
          <dt className="text-sm font-semibold text-muted-foreground">
            {STAT_LABELS[stat.key].label}
          </dt>
          <dd className="tabular text-right text-base font-bold">{stat.value}</dd>
          <dd aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (stat.value / MAX_STAT) * 100)}%`,
                background: barColor(stat.value),
              }}
            />
          </dd>
        </div>
      ))}
      <div className="grid grid-cols-[7.5rem_2.75rem_1fr] items-center gap-3 border-t pt-3">
        <dt className="text-sm font-semibold">Total</dt>
        <dd className="tabular text-right text-base font-bold">{total}</dd>
      </div>
    </dl>
  );
}
