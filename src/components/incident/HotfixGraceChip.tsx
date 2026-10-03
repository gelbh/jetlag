import { useAppUpdateState } from "../../hooks/app/useAppUpdateState";
import { MapFloatSurface } from "../ui/banners/MapFloatSurface";
import { HudBanner } from "../ui/hud/HudBanner";

const MAP_STATUS_CHIP_CLASS = "pointer-events-auto mx-3 mt-1.5 z-[var(--z-panel)]";

export function HotfixGraceChip() {
  const { hotfixGraceActive, hotfixGraceSecondsRemaining } = useAppUpdateState();
  const seconds =
    typeof hotfixGraceSecondsRemaining === "number" ? hotfixGraceSecondsRemaining : null;

  return (
    <HudBanner visible={hotfixGraceActive && seconds !== null} className={MAP_STATUS_CHIP_CLASS}>
      <MapFloatSurface
        tone="halt"
        role="status"
        aria-live="polite"
        className="mx-auto max-w-[min(calc(100%-1.5rem),24rem)]"
      >
        <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-action">
          Update required
        </p>
        <p className="text-sm text-ink">
          {seconds === null ? "Refreshing…" : `Update required - refreshing in ${seconds}s`}
        </p>
      </MapFloatSurface>
    </HudBanner>
  );
}
