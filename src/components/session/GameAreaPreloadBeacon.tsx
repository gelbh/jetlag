import { useId } from "react";
import { useShallow } from "zustand/react/shallow";
import { HudRefreshIcon } from "../ui/HudIcons";
import { loadingSpinnerClass } from "../ui/loadingSpinnerClass";
import { selectPreloadBanner, usePreloadStore } from "../../state/preloadStore";
import { GameAreaPreloadDetailPanel } from "./GameAreaPreloadDetailPanel";

interface GameAreaPreloadBeaconProps {
  detailOpen: boolean;
  onDetailOpenChange: (open: boolean) => void;
}

function preloadBeaconAriaLabel(
  title: string,
  loading: boolean,
  completedJobs: number,
  totalJobs: number,
): string {
  if (loading) {
    return `${title}. ${completedJobs} of ${totalJobs} complete. Show details`;
  }

  return `${title}. Show details`;
}

export function GameAreaPreloadBeacon({
  detailOpen,
  onDetailOpenChange,
}: GameAreaPreloadBeaconProps) {
  const banner = usePreloadStore(useShallow(selectPreloadBanner));
  const dismiss = usePreloadStore((state) => state.dismiss);
  const detailId = useId();

  if (!banner.visible) {
    return null;
  }

  return (
    <div className="jl-preload-map-indicator">
      <button
        type="button"
        className={`jl-sync-map-indicator__btn${detailOpen ? " jl-sync-map-indicator__btn--open" : ""}`}
        aria-label={preloadBeaconAriaLabel(
          banner.title,
          banner.loading,
          banner.completedJobs,
          banner.totalJobs,
        )}
        aria-expanded={detailOpen}
        aria-controls={detailId}
        onClick={() => onDetailOpenChange(!detailOpen)}
      >
        <span
          className={`jl-preload-beacon jl-preload-beacon--md ${
            banner.failed ? "jl-preload-beacon--failed" : "jl-preload-beacon--loading"
          }`}
          aria-hidden="true"
        >
          <HudRefreshIcon
            className={`jl-preload-beacon__icon stroke-[2.5] ${loadingSpinnerClass(banner.loading)}`}
          />
        </span>
      </button>
      {detailOpen ? (
        <div id={detailId}>
          <GameAreaPreloadDetailPanel
            loading={banner.loading}
            failed={banner.failed}
            title={banner.title}
            body={banner.body}
            completedJobs={banner.completedJobs}
            totalJobs={banner.totalJobs}
            onClose={() => onDetailOpenChange(false)}
            onDismiss={
              banner.failed
                ? () => {
                    dismiss();
                    onDetailOpenChange(false);
                  }
                : undefined
            }
          />
        </div>
      ) : null}
    </div>
  );
}
