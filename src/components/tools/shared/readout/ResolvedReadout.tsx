import type { ReactNode } from "react";

type ResolvedReadoutVariant = "default" | "warning" | "dim";

interface ResolvedReadoutProps {
  children: ReactNode;
  caption?: ReactNode;
  variant?: ResolvedReadoutVariant;
}

const VARIANT_CLASS: Record<ResolvedReadoutVariant, string> = {
  default: "text-ink-secondary",
  warning: "text-status-warning",
  dim: "text-ink-dim",
};

export function ResolvedReadout({
  children,
  caption,
  variant = "default",
}: ResolvedReadoutProps) {
  return (
    <div className="space-y-1">
      <p
        className={`font-mono text-sm tabular-nums ${VARIANT_CLASS[variant]}`}
      >
        {children}
      </p>
      {caption ? (
        <p className="text-xs text-ink-dim">{caption}</p>
      ) : null}
    </div>
  );
}
