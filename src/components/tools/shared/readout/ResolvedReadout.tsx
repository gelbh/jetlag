import type { ReactNode } from "react";

type ResolvedReadoutVariant = "default" | "warning" | "dim";

interface ResolvedReadoutProps {
  children: ReactNode;
  caption?: ReactNode;
  variant?: ResolvedReadoutVariant;
}

const VARIANT_COLOR: Record<ResolvedReadoutVariant, string> = {
  default: "var(--color-field-ink)",
  warning: "var(--color-halt)",
  dim: "var(--color-field-ink-muted)",
};

export function ResolvedReadout({ children, caption, variant = "default" }: ResolvedReadoutProps) {
  return (
    <div className="space-y-1">
      <p
        style={{
          margin: 0,
          fontFamily: "ui-monospace, monospace",
          fontSize: "0.875rem",
          fontVariantNumeric: "tabular-nums",
          color: VARIANT_COLOR[variant],
        }}
      >
        {children}
      </p>
      {caption ? (
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            color: "var(--color-field-ink-muted)",
          }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
