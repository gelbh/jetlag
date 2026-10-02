import { useAppUpdateState } from "../../hooks/app/useAppUpdateState";
import { MapFloatSurface } from "../ui/banners/MapFloatSurface";
import { HudBanner } from "../ui/hud/HudBanner";

export function HotfixGraceChip() {
  const { hotfixGraceActive, hotfixGraceSecondsRemaining } = useAppUpdateState();
  const seconds =
    typeof hotfixGraceSecondsRemaining === "number" ? hotfixGraceSecondsRemaining : null;

  return (
    <HudBanner
      visible={hotfixGraceActive && seconds !== null}
      className="jl-hotfix-grace-chip pointer-events-auto fixed inset-x-0 z-[var(--z-panel)] px-3"
    >
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
