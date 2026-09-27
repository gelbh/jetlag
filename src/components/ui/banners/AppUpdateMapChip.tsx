import { Button } from "@mantine/core";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { useAppUpdateState } from "@/hooks/app/useAppUpdateState";
import { HudBanner } from "../hud/HudBanner";
import { MapFloatSurface } from "./MapFloatSurface";

export function AppUpdateMapChip() {
  const { showMapChip, dismissDeferred } = useAppUpdateState();

  return (
    <HudBanner
      visible={showMapChip}
      className="jl-app-update-chip pointer-events-auto fixed inset-x-0 z-[var(--z-panel)] px-3"
    >
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
        <Button
          type="button"
          variant="default"
          size="compact-md"
          onClick={dismissDeferred}
        >
          {appUpdateCopy.deferredDismiss}
        </Button>
      </MapFloatSurface>
    </HudBanner>
  );
}
