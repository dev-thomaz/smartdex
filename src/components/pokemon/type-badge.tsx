import { cn } from "@/lib/utils";
import { TYPE_LABELS } from "@/lib/labels";
import type { TypeName } from "@/types/domain";

interface TypeBadgeProps {
  type: TypeName;
  size?: "sm" | "md";
  className?: string;
}

export function TypeBadge({ type, size = "md", className }: TypeBadgeProps) {
  return (
    <span
      data-type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-(--type-bg) font-bold text-(--type-fg)",
        size === "sm" ? "h-6 px-2.5 text-xs" : "h-7 px-3 text-sm",
        className,
      )}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

export function TypeList({
  types,
  size,
  className,
}: {
  types: readonly TypeName[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {types.map((type) => (
        <TypeBadge key={type} type={type} size={size} />
      ))}
    </span>
  );
}
