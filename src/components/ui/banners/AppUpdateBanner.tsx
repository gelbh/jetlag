import { Button } from "@mantine/core";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { useAppUpdateState } from "@/hooks/app/useAppUpdateState";
import { HudBanner } from "../hud/HudBanner";
import { MapFloatSurface } from "./MapFloatSurface";

export function AppUpdateBanner() {
  const { showGlobalBanner, applyUpdate } = useAppUpdateState();

  return (
    <HudBanner
      visible={showGlobalBanner}
      className="pointer-events-auto fixed inset-x-0 top-0 z-[var(--z-toast)] px-3 pt-[max(0.5rem,var(--safe-area-top))]"
    >
      <MapFloatSurface
        tone="default"
        role="status"
        actionRow
        className="mx-auto max-w-[min(calc(100%-1.5rem),24rem)]"
      >
        <p className="min-w-0 font-display text-xs font-semibold uppercase tracking-[0.08em] text-highlight">
          {appUpdateCopy.readyTitle}
        </p>
        <Button type="button" variant="filled" size="md" onClick={applyUpdate}>
          {appUpdateCopy.readyAction}
        </Button>
      </MapFloatSurface>
    </HudBanner>
  );
}
