import { HudRefreshIcon } from "../ui/HudIcons";
import { HudDetailPanel } from "../ui/HudDetailPanel";
import { loadingSpinnerClass } from "../ui/loadingSpinnerClass";

interface GameAreaPreloadDetailPanelProps {
  loading: boolean;
  failed: boolean;
  title: string;
  body: string;
  completedJobs: number;
  totalJobs: number;
  onClose: () => void;
  onDismiss?: () => void;
}

export function GameAreaPreloadDetailPanel({
  loading,
  failed,
  title,
  body,
  completedJobs,
  totalJobs,
  onClose,
  onDismiss,
}: GameAreaPreloadDetailPanelProps) {
  const progress =
    totalJobs > 0 ? Math.min(100, (completedJobs / totalJobs) * 100) : 0;
  const statusClass = failed
    ? "jl-preload-detail-panel--failed"
    : "jl-preload-detail-panel--loading";

  return (
    <HudDetailPanel
      panelClassName={`jl-preload-detail-panel ${statusClass}`}
      ariaLabel={title}
      leading={
        <span
          className={`jl-preload-beacon jl-preload-beacon--sm ${
            failed ? "jl-preload-beacon--failed" : "jl-preload-beacon--loading"
          }`}
          aria-hidden="true"
        >
          <HudRefreshIcon
            className={`jl-preload-beacon__icon stroke-[2.5] ${loadingSpinnerClass(loading)}`}
          />
        </span>
      }
      title={title}
      titleClassName="jl-preload-detail-panel__title"
      onClose={onClose}
      closeLabel="Close map preload details"
      actionLabel={failed && onDismiss ? "Dismiss" : undefined}
      onAction={onDismiss}
    >
      {loading ? (
        <div className="jl-preload-detail-panel__progress">
          <div className="jl-preload-detail-panel__progress-meta">
            <span className="jl-preload-detail-panel__progress-label">
              Progress
            </span>
            <span
              className="jl-preload-detail-panel__progress-count tabular-nums"
              aria-live="polite"
            >
              {completedJobs}/{totalJobs}
            </span>
          </div>
          <div
            className="jl-preload-detail-panel__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalJobs}
            aria-valuenow={completedJobs}
            aria-label={`Map preload progress, ${completedJobs} of ${totalJobs}`}
          >
            <span
              className="jl-preload-detail-panel__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
      <p className="jl-preload-detail-panel__body">{body}</p>
    </HudDetailPanel>
  );
}
