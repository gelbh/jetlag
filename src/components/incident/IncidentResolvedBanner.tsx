import { Button, Group } from "@mantine/core";
import type { IncidentNotice } from "../../services/firestore/firestoreIncidentNotices";
import { MapFloatSurface } from "../ui/banners/MapFloatSurface";
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
      <MapFloatSurface
        tone="info"
        role="status"
        aria-live="polite"
        aria-labelledby="incident-resolved-title"
        aria-describedby="incident-resolved-body"
        className="pointer-events-auto mx-auto max-w-md"
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
        <Group gap="sm" mt="sm" justify="flex-end" wrap="wrap">
          <Button
            type="button"
            variant="default"
            size="compact-md"
            onClick={() => {
              onDismiss(notice.incidentId);
            }}
          >
            Dismiss
          </Button>
        </Group>
      </MapFloatSurface>
    </HudBanner>
  );
}
