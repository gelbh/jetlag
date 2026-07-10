import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";
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
        className="hud-chrome pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-full"
        aria-label={banner.label}
        aria-expanded={detailOpen}
        aria-controls={detailId}
        onClick={() => setDetailOpen((open) => !open)}
      >
        <span
          className={`inline-block h-4 w-4 ${
            banner.loading
              ? "motion-reduce:animate-none animate-spin rounded-full border-2 border-brand-blue border-t-transparent"
              : ""
          }`}
          aria-hidden="true"
        >
          {!banner.loading ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-brand-blue">
              <path
                d="M12 3v9m0 0l3.5-3.5M12 12L8.5 8.5M5 19h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
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
