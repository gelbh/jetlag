import type { SyncStatus } from "../../domain/device/sync";
import { SyncStatusBeacon } from "./SyncStatusDot";

interface SyncStatusDetailPanelProps {
  status: SyncStatus;
  title: string;
  body: string;
  actionLabel?: string | null;
  onAction?: () => void;
  onClose: () => void;
}

const STATUS_TEXT_CLASS: Record<SyncStatus, string> = {
  synced: "text-status-success",
  saving: "text-status-info",
  offline: "text-status-warning",
  degraded: "text-status-warning",
  error: "text-status-error",
};

export function SyncStatusDetailPanel({
  status,
  title,
  body,
  actionLabel,
  onAction,
  onClose,
}: SyncStatusDetailPanelProps) {
  return (
    <div
      className="jl-sync-detail-panel jl-panel-enter pointer-events-auto"
      role="dialog"
      aria-label="Sync status"
    >
      <div className="jl-sync-detail-panel__row">
        <SyncStatusBeacon status={status} size="sm" />
        <p
          className={`jl-sync-detail-panel__status ${STATUS_TEXT_CLASS[status]}`}
        >
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="jl-sync-detail-panel__close"
          aria-label="Close sync details"
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

      <p className="jl-sync-detail-panel__detail">{body}</p>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="btn-secondary jl-sync-detail-panel__action"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
