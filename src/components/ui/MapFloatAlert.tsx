import type { ReactNode } from "react";

interface MapFloatAlertProps {
  children: ReactNode;
  className?: string;
  role?: "status" | "alert";
  "aria-live"?: "polite" | "assertive" | "off";
}

export function MapFloatAlert({
  children,
  className = "",
  role = "status",
  "aria-live": ariaLive = "polite",
}: MapFloatAlertProps) {
  return (
    <p
      className={`map-float-alert border-2 border-highlight bg-surface-deep px-3 py-2 text-center text-sm font-semibold uppercase tracking-wide text-pretty text-ink ${className}`.trim()}
      role={role}
      aria-live={ariaLive}
    >
      {children}
    </p>
  );
}

interface MapFloatAlertPanelProps {
  children: ReactNode;
  className?: string;
  role?: "status" | "alert";
}

export function MapFloatAlertPanel({
  children,
  className = "",
  role = "alert",
}: MapFloatAlertPanelProps) {
  return (
    <div
      className={`map-float-alert flex items-center justify-between gap-3 border-2 border-status-error/40 bg-status-error-surface px-3 py-2 ${className}`.trim()}
      role={role}
    >
      {children}
    </div>
  );
}
