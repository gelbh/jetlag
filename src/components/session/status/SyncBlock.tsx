import type { SyncStatus } from "../../../domain/device/sync";
import { userErrorFromSyncMessage } from "../../../domain/device/userErrors";
import { SyncStatusBeacon } from "../SyncStatusDot";
import { SyncStatusDetailPanel } from "../SyncStatusDetailPanel";
import { syncDetailContent } from "../syncStatusDetailContent";
import { syncBeaconAriaLabel } from "./syncRailDisplay";

interface SyncBlockProps {
  syncStatus: SyncStatus;
  queuedWrites: number;
  message?: string | null;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onSyncErrorAction?: () => void;
}

export function SyncBlock({
  syncStatus,
  queuedWrites,
  message,
  menuOpen,
  onMenuOpenChange,
  onSyncErrorAction,
}: SyncBlockProps) {
  const syncErrorDisplay = userErrorFromSyncMessage(message);
  const syncDetail = syncDetailContent(
    syncStatus,
    queuedWrites,
    message,
    syncErrorDisplay,
  );
  const syncActionLabel =
    syncErrorDisplay?.actionLabel ??
    (syncStatus === "offline" ||
    syncStatus === "degraded" ||
    syncStatus === "error"
      ? "Retry"
      : null);

  const showSyncDot =
    syncStatus === "synced" ||
    syncStatus === "error" ||
    syncStatus === "offline" ||
    syncStatus === "degraded" ||
    syncStatus === "saving";

  if (!showSyncDot) {
    return null;
  }

  return (
    <div className="jl-sync-map-indicator">
      <button
        type="button"
        className={`jl-sync-map-indicator__btn${menuOpen ? " jl-sync-map-indicator__btn--open" : ""}`}
        onClick={() => onMenuOpenChange(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        aria-label={syncBeaconAriaLabel(syncStatus)}
      >
        <SyncStatusBeacon status={syncStatus} size="md" />
      </button>

      {menuOpen ? (
        <SyncStatusDetailPanel
          status={syncStatus}
          title={syncDetail.title}
          body={syncDetail.body}
          actionLabel={syncActionLabel}
          onAction={
            syncActionLabel && onSyncErrorAction
              ? () => {
                  onSyncErrorAction();
                  onMenuOpenChange(false);
                }
              : undefined
          }
          onClose={() => onMenuOpenChange(false)}
        />
      ) : null}
    </div>
  );
}
