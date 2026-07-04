import type { ReactNode } from "react";

type LoadingReadoutVariant = "default" | "dim";

interface LoadingReadoutProps {
  children: ReactNode;
  variant?: LoadingReadoutVariant;
}

const VARIANT_CLASS: Record<LoadingReadoutVariant, string> = {
  default: "text-ink-secondary",
  dim: "text-ink-dim",
};

export function LoadingReadout({
  children,
  variant = "dim",
}: LoadingReadoutProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex items-center gap-2 font-mono text-sm ${VARIANT_CLASS[variant]}`}
    >
      <span
        className="loading-spinner size-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        aria-hidden
      />
      <span>{children}</span>
    </div>
  );
}
