import { type ReactNode, useEffect, useState } from "react";
import { LoadingSpinnerRing } from "@/components/ui/feedback/LoadingSpinner";

type LoadingReadoutVariant = "default" | "dim";

interface LoadingReadoutProps {
  children: ReactNode;
  variant?: LoadingReadoutVariant;
}

const VARIANT_COLOR: Record<LoadingReadoutVariant, string> = {
  default: "var(--color-field-ink)",
  dim: "var(--color-field-ink-muted)",
};

const STALE_LOADING_MS = 10_000;

export function LoadingReadout({ children, variant = "dim" }: LoadingReadoutProps) {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    setStale(false);
    const timerId = window.setTimeout(() => setStale(true), STALE_LOADING_MS);
    return () => window.clearTimeout(timerId);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-1"
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: "0.875rem",
        color: VARIANT_COLOR[variant],
      }}
    >
      <div className="flex items-center gap-2">
        <LoadingSpinnerRing />
        <span>{children}</span>
      </div>
      {stale ? (
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            color: "var(--color-field-ink-muted)",
          }}
        >
          Map data is still loading. This can take up to a minute on slow connections.
        </p>
      ) : null}
    </div>
  );
}
