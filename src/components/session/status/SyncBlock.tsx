import type { SyncStatus } from "@/domain/device/sync/sync";
import { userErrorFromSyncMessage } from "@/domain/device/feedback/userErrors";
import { surveySyncShortLabel } from "@/domain/device/surveyStatusCopy";
import { usePlayerUxWorld } from "@/hooks/feature/usePlayerUxWorld";
import { SyncStatusBeacon } from "../syncUi/SyncStatusDot";
import { SyncStatusDetailPanel } from "../syncUi/SyncStatusDetailPanel";
import { syncDetailContent } from "../syncUi/syncStatusDetailContent";
import {
  SYNC_TONE_CLASSES,
  syncBeaconAriaLabel,
  syncRailDisplay,
} from "./syncRailDisplay";

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
  const survey = usePlayerUxWorld();
  const syncErrorDisplay = userErrorFromSyncMessage(message);
  const syncDisplay = syncRailDisplay(syncStatus, queuedWrites, message);
  const shortLabel = survey
    ? surveySyncShortLabel(syncStatus, queuedWrites)
    : syncDisplay.inline?.visible
      ? syncDisplay.inline.label
      : null;
  const shortLabelTone = survey
    ? syncDisplay.inline?.tone ??
      (syncStatus === "error"
        ? "error"
        : syncStatus === "offline" || syncStatus === "degraded"
          ? "warning"
          : syncStatus === "saving"
            ? "info"
            : null)
    : syncDisplay.inline?.tone;
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
    survey ||
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
        className={`jl-sync-map-indicator__btn inline-flex min-h-11 min-w-11 items-center justify-center${menuOpen ? " jl-sync-map-indicator__btn--open" : ""}${shortLabel ? " jl-sync-map-indicator__btn--labeled gap-1.5 border-2 border-border bg-surface-deep px-2.5 shadow-hud-float" : ""}`}
        onClick={() => onMenuOpenChange(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        aria-label={
          shortLabel
            ? `${shortLabel}. Show sync details`
            : syncBeaconAriaLabel(syncStatus)
        }
      >
        {shortLabel ? (
          <span
            className={`max-w-[7.5rem] text-pretty text-xs font-semibold leading-tight${shortLabelTone ? ` ${SYNC_TONE_CLASSES[shortLabelTone].text}` : ""}`}
          >
            {shortLabel}
          </span>
        ) : null}
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
