import { useId } from "react";
import { useShallow } from "zustand/react/shallow";
import { HudRefreshIcon } from "../../ui/brand/HudIcons";
import { loadingSpinnerClass } from "../../ui/feedback/loadingSpinnerClass";
import { selectPreloadBanner, usePreloadStore } from "@/state/preloadStore";
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

  const ariaLabel = preloadBeaconAriaLabel(
    banner.title,
    banner.loading,
    banner.completedJobs,
    banner.totalJobs,
  );

  const bareIcon = (
    <HudRefreshIcon
      className={`h-5 w-5 stroke-[2.5] ${loadingSpinnerClass(banner.loading)}`}
      aria-hidden
      style={{
        color: banner.failed
          ? "var(--color-halt)"
          : "var(--color-signal)",
      }}
    />
  );

  const detail = detailOpen ? (
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
  ) : null;

  return (
    <div className="jl-preload-map-indicator" data-testid="preload-beacon-mantine">
      <button
        type="button"
        className="pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border-0 bg-transparent p-0"
        onClick={() => onDetailOpenChange(!detailOpen)}
        aria-label={ariaLabel}
        aria-expanded={detailOpen}
        aria-controls={detailId}
        style={{
          color: detailOpen
            ? "var(--color-flag)"
            : "var(--color-field-ink)",
        }}
      >
        {bareIcon}
      </button>
      {detail}
    </div>
  );
}
