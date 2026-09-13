import type { IncidentNotice } from "../../services/firestore/firestoreIncidentNotices";
import { HudBanner } from "../ui/hud/HudBanner";

interface IncidentResolvedBannerProps {
  notice: IncidentNotice | null;
  onDismiss: (incidentId: string) => void;
}

export function IncidentResolvedBanner({
  notice,
  onDismiss,
}: IncidentResolvedBannerProps) {
  if (!notice) {
    return null;
  }

  return (
    <HudBanner
      visible
      className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-banner)] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div
        className="pointer-events-auto hud-panel mx-auto flex max-w-md flex-col gap-2 px-3 py-2.5"
        role="status"
        aria-live="polite"
        aria-labelledby="incident-resolved-title"
        aria-describedby="incident-resolved-body"
      >
        <p
          id="incident-resolved-title"
          className="font-display text-xs font-semibold uppercase tracking-wide text-ink"
        >
          Issue fixed
        </p>
        <p
          id="incident-resolved-body"
          className="text-pretty text-sm leading-snug text-ink-muted"
        >
          Your issue has been fixed. Refresh or update the app if you still see
          the problem.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-secondary min-h-11 px-4 text-xs"
            onClick={() => {
              onDismiss(notice.incidentId);
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </HudBanner>
  );
}
