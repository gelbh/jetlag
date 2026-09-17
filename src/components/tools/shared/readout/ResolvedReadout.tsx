import type { ReactNode } from "react";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";

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

const VARIANT_COLOR: Record<ResolvedReadoutVariant, string> = {
  default: "var(--color-field-ink)",
  warning: "var(--color-halt)",
  dim: "var(--color-field-ink-muted)",
};

export function ResolvedReadout({
  children,
  caption,
  variant = "default",
}: ResolvedReadoutProps) {
  const mantinePlayerUi = usePlayerUiMantine();

  if (mantinePlayerUi) {
    return (
      <div className="space-y-1" data-player-ux-world="mantine">
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
