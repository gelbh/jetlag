import { Button } from "@mantine/core";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { MAP_NOTICE_DURATION_MS } from "@/domain/ui/mapNoticeLifetime";
import { useAppUpdateState } from "@/hooks/app/useAppUpdateState";
import { useTimedDismiss } from "@/hooks/ui/useTimedDismiss";
import { HudBanner } from "../hud/HudBanner";
import { MapFloatSurface } from "./MapFloatSurface";

const MAP_STATUS_CHIP_CLASS = "pointer-events-auto mx-3 mt-1.5 z-[var(--z-panel)]";

export function AppUpdateMapChip() {
  const { showMapChip, dismissDeferred } = useAppUpdateState();
  useTimedDismiss({
    active: showMapChip,
    ms: MAP_NOTICE_DURATION_MS.updateWaiting,
    onDismiss: dismissDeferred,
  });

  return (
    <HudBanner visible={showMapChip} className={`jl-map-status-chip ${MAP_STATUS_CHIP_CLASS}`}>
      <MapFloatSurface
        tone="default"
        role="status"
        aria-live="polite"
        actionRow
        className="mx-auto max-w-[min(calc(100%-1.5rem),24rem)]"
      >
        <div className="min-w-0 text-left">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-highlight">
            {appUpdateCopy.deferredTitle}
          </p>
          <p className="text-sm text-ink">{appUpdateCopy.deferredBody}</p>
        </div>
        <Button type="button" variant="default" size="md" onClick={dismissDeferred}>
          {appUpdateCopy.deferredDismiss}
        </Button>
      </MapFloatSurface>
    </HudBanner>
  );
}
