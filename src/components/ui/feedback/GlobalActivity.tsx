import { LoadingSpinnerRing } from "./LoadingSpinner";

interface GlobalActivityProps {
  pendingWrites?: number;
  settling?: boolean;
  label?: string;
  className?: string;
}

/**
 * Non-blocking activity chip for background sync / route settling.
 * Never full-bleed; pointer-events only on itself.
 */
export function GlobalActivity({
  pendingWrites = 0,
  settling = false,
  label,
  className = "",
}: GlobalActivityProps) {
  const active = pendingWrites > 0 || settling;
  if (!active) {
    return null;
  }

  const text =
    label ??
    (pendingWrites > 0
      ? pendingWrites === 1
        ? "Saving…"
        : `Saving ${pendingWrites}…`
      : "Loading…");

  return (
    <div
      className={`pointer-events-auto inline-flex items-center gap-2 rounded-md border border-border bg-surface-panel/95 px-2 py-1 text-xs text-ink shadow-hud-float ${className}`}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinnerRing size="sm" className="text-brand-blue" />
      <span>{text}</span>
    </div>
  );
}
