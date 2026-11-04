import { cn } from "@/lib/utils";

import type { Progress } from "../progress";

interface ProgressMeterProps {
  label: string;
  progress: Progress | null;
  className?: string;
  size?: "sm" | "md";
}

/** Accessible progress bar; `progress = null` renders a loading state. */
export function ProgressMeter({ label, progress, className, size = "md" }: ProgressMeterProps) {
  const percent = progress?.percent ?? 0;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("font-semibold", size === "sm" ? "text-sm" : "text-base")}>
          {label}
        </span>
        <span className="tabular text-sm text-muted-foreground">
          {progress ? (
            <>
              <strong className="text-foreground">{progress.caught}</strong> de {progress.total} ·{" "}
              {percent.toLocaleString("pt-BR")}%
            </>
          ) : (
            "Carregando…"
          )}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={progress?.total ?? 0}
        aria-valuenow={progress?.caught ?? 0}
        aria-valuetext={
          progress
            ? `${progress.caught} de ${progress.total} capturados, faltam ${progress.missing}`
            : "Carregando"
        }
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-2" : "h-2.5",
        )}
      >
        <div
          className="h-full rounded-full bg-caught transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
