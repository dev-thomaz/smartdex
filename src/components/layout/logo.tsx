import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M6 16h7.2M18.8 16H26"
        className="stroke-primary-foreground"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle
        cx="16"
        cy="16"
        r="4.2"
        className="fill-none stroke-primary-foreground"
        strokeWidth="2.4"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-lg font-bold tracking-tight">SmartDex</span>
    </span>
  );
}
