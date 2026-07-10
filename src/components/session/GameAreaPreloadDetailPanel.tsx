import { HudRefreshIcon } from "../ui/HudIcons";

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
    <div
      className={`jl-preload-detail-panel jl-panel-enter pointer-events-auto ${statusClass}`}
      role="dialog"
      aria-label={title}
    >
      <div className="jl-preload-detail-panel__row">
        <span
          className={`jl-preload-beacon jl-preload-beacon--sm ${
            failed ? "jl-preload-beacon--failed" : "jl-preload-beacon--loading"
          }`}
          aria-hidden="true"
        >
          <HudRefreshIcon
            className={`jl-preload-beacon__icon stroke-[2.5] ${
              loading ? "loading-spinner motion-reduce:animate-none" : ""
            }`}
          />
        </span>
        <p className="jl-preload-detail-panel__title">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="jl-sync-detail-panel__close"
          aria-label="Close map preload details"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

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

      {failed && onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="btn-secondary jl-sync-detail-panel__action"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
