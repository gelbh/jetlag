import { useState } from "react";
import {
  RequestPreloadSection,
  type RequestPreloadSectionProps,
} from "./RequestPreloadSection";

export type RequestPackWhenUnavailableProps = RequestPreloadSectionProps & {
  /** When false, the CTA stays hidden after dismiss until remount/reset. */
  initiallyDismissed?: boolean;
};

/**
 * Dismissible no-pack CTA around {@link RequestPreloadSection}.
 * Show only when a play area is set and no qualifying pack attaches.
 */
export function RequestPackWhenUnavailable({
  initiallyDismissed = false,
  ...sectionProps
}: RequestPackWhenUnavailableProps) {
  const [dismissed, setDismissed] = useState(initiallyDismissed);

  if (dismissed) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs leading-snug text-ink-muted">
          Optional — dismiss if you do not need a custom location pack.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="min-h-11 shrink-0 font-display text-xs font-semibold uppercase tracking-wide text-ink-dim"
        >
          Dismiss
        </button>
      </div>
      <RequestPreloadSection {...sectionProps} />
    </div>
  );
}
