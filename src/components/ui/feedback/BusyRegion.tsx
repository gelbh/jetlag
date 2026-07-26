import type { ReactNode } from "react";

interface BusyRegionProps {
  busy: boolean;
  /** Shown while busy; falls back to children when omitted. */
  skeleton?: ReactNode;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

/** Marks a panel/list region as aria-busy without blocking the rest of the app. */
export function BusyRegion({
  busy,
  skeleton,
  children,
  className = "",
  "aria-label": ariaLabel,
}: BusyRegionProps) {
  return (
    <div
      className={className}
      aria-busy={busy || undefined}
      aria-label={ariaLabel}
    >
      {busy && skeleton != null ? skeleton : children}
    </div>
  );
}
