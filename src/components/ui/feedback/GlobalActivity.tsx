import { mapChromeSurfaceStyles } from "@/components/ui/entry/entryChrome";
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
      className={`pointer-events-auto inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs ${className}`}
      style={{
        ...mapChromeSurfaceStyles,
        color: "var(--color-field-ink)",
      }}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinnerRing size="sm" className="text-brand-blue" />
      <span>{text}</span>
    </div>
  );
}
