import { appUpdateCopy } from "../../domain/device/appUpdateCopy";
import { useAppUpdateState } from "../../hooks/useAppUpdateState";
import { HudBanner } from "./HudBanner";

export function AppUpdateMapChip() {
  const { showMapChip, dismissDeferred } = useAppUpdateState();

  return (
    <HudBanner
      visible={showMapChip}
      className="jl-app-update-chip pointer-events-auto fixed inset-x-0 z-[var(--z-panel)] px-3"
    >
      <div
        className="map-float-alert mx-auto flex max-w-[min(calc(100%-1.5rem),24rem)] items-center justify-between gap-3 border-2 border-highlight bg-surface-deep px-3 py-2 normal-case tracking-normal"
        role="status"
        aria-live="polite"
      >
        <div className="min-w-0 text-left">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-highlight">
            {appUpdateCopy.deferredTitle}
          </p>
          <p className="text-sm text-ink">{appUpdateCopy.deferredBody}</p>
        </div>
        <button
          type="button"
          className="btn-secondary min-h-11 shrink-0 px-3 text-xs"
          onClick={dismissDeferred}
        >
          {appUpdateCopy.deferredDismiss}
        </button>
      </div>
    </HudBanner>
  );
}
