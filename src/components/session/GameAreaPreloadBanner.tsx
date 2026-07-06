import { useShallow } from "zustand/react/shallow";
import { selectPreloadBanner, usePreloadStore } from "../../state/preloadStore";

export function GameAreaPreloadBanner() {
  const banner = usePreloadStore(useShallow(selectPreloadBanner));
  const dismiss = usePreloadStore((state) => state.dismiss);

  if (!banner.visible) {
    return null;
  }

  return (
    <div
      className={`map-float-alert pointer-events-auto mx-3 mt-2 border px-3 py-2 text-sm ${
        banner.failed
          ? "border-status-warning/40 bg-status-warning-surface text-status-warning"
          : "border-status-info/40 bg-status-info-surface text-status-info"
      }`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <p>{banner.label}</p>
        {!banner.loading ? (
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 text-xs font-medium underline underline-offset-2"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
