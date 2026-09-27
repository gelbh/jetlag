import { Button } from "@mantine/core";
import { useLocation } from "react-router-dom";
import { appUpdateCopy } from "@/domain/device/updates/appUpdateCopy";
import { isStandalonePwa } from "@/domain/device/pwa/isStandalonePwa";
import { useAppUpdateState } from "@/hooks/app/useAppUpdateState";
import { HudBanner } from "../hud/HudBanner";
import { MapFloatAlertPanel } from "./MapFloatAlert";

export function AppUpdateBanner() {
  const location = useLocation();
  const { showGlobalBanner, applyUpdate } = useAppUpdateState();

  const preferBottom =
    isStandalonePwa() || location.pathname === "/map";

  return (
    <HudBanner
      visible={showGlobalBanner}
      className={
        preferBottom
          ? "jl-app-update-chip pointer-events-auto fixed inset-x-0 z-[var(--z-toast)] px-3"
          : "pointer-events-auto fixed inset-x-0 top-0 z-[var(--z-toast)] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
      }
    >
      <MapFloatAlertPanel className="mx-auto max-w-[min(calc(100%-1.5rem),24rem)]">
        <p className="min-w-0 font-display text-xs font-semibold uppercase tracking-[0.08em] text-highlight">
          {appUpdateCopy.readyTitle}
        </p>
        <Button
          type="button"
          variant="filled"
          size="compact-md"
          onClick={applyUpdate}
        >
          {appUpdateCopy.readyAction}
        </Button>
      </MapFloatAlertPanel>
    </HudBanner>
  );
}
