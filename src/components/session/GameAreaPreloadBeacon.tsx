import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { HudRefreshIcon } from "../ui/HudIcons";
import { selectPreloadBanner, usePreloadStore } from "../../state/preloadStore";

export function GameAreaPreloadBeacon() {
  const banner = usePreloadStore(useShallow(selectPreloadBanner));
  const dismiss = usePreloadStore((state) => state.dismiss);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailId = useId();

  if (!banner.visible) {
    return null;
  }

  return (
    <div className="jl-preload-map-indicator pointer-events-none absolute left-[max(0.625rem,env(safe-area-inset-left))] top-[var(--jl-sync-beacon-top)] z-[var(--z-panel)] flex flex-col items-start gap-1">
      <button
        type="button"
        className={`jl-sync-map-indicator__btn${detailOpen ? " jl-sync-map-indicator__btn--open" : ""}`}
        aria-label={banner.label}
        aria-expanded={detailOpen}
        aria-controls={detailId}
        onClick={() => setDetailOpen((open) => !open)}
      >
        <span
          className={`jl-preload-beacon jl-preload-beacon--md ${
            banner.failed ? "jl-preload-beacon--failed" : "jl-preload-beacon--loading"
          }`}
          aria-hidden="true"
        >
          <HudRefreshIcon
            className={`jl-preload-beacon__icon stroke-[2.5] ${
              banner.loading ? "loading-spinner motion-reduce:animate-none" : ""
            }`}
          />
        </span>
      </button>
      {detailOpen ? (
        <div
          id={detailId}
          className={`jl-sync-detail-panel pointer-events-auto max-w-[min(16rem,calc(100vw-2rem))] border px-3 py-2 text-xs ${
            banner.failed
              ? "border-status-warning/40 bg-status-warning-surface text-status-warning"
              : "border-status-info/40 bg-status-info-surface text-status-info"
          }`}
          role="status"
        >
          <p>{banner.label}</p>
          {!banner.loading ? (
            <button
              type="button"
              onClick={dismiss}
              className="mt-1 min-h-11 font-medium underline underline-offset-2"
            >
              Dismiss
            </button>
          ) : (
            <p className="mt-1 text-ink-muted motion-reduce:animate-none">Loading…</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
