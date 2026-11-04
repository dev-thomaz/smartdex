import { cn } from "@/lib/utils";

interface PokeballIconProps {
  /** `color`: red/white ball (caught state). `outline`: single-color line art (watermarks). */
  variant?: "color" | "outline";
  className?: string;
}

/** Simple Poké Ball drawing used as the "caught" mark and as a watermark. Decorative only. */
export function PokeballIcon({ variant = "color", className }: PokeballIconProps) {
  if (variant === "outline") {
    return (
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={cn("fill-none stroke-current", className)}
      >
        <circle cx="16" cy="16" r="14.5" strokeWidth="1.6" />
        <path d="M1.5 16h9.2M21.3 16h9.2" strokeWidth="1.6" />
        <circle cx="16" cy="16" r="4.6" strokeWidth="1.6" />
        <circle cx="16" cy="16" r="1.8" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="14.5" fill="#fff" />
      <path d="M1.5 16a14.5 14.5 0 0 1 29 0Z" fill="#e3350d" />
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="#1d1d22" strokeWidth="2" />
      <path d="M1.5 16h9.2M21.3 16h9.2" stroke="#1d1d22" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="4.4" fill="#fff" stroke="#1d1d22" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="1.7" fill="#fff" stroke="#1d1d22" strokeWidth="1" />
    </svg>
  );
}
