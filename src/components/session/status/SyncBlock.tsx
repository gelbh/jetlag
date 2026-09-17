import { Group, Paper, Text, UnstyledButton } from "@mantine/core";
import type { SyncStatus } from "@/domain/device/sync/sync";
import { userErrorFromSyncMessage } from "@/domain/device/feedback/userErrors";
import {
  surveySyncSegmentLabel,
  surveySyncShortLabel,
} from "@/domain/device/surveyStatusCopy";
import { iosMapChromeSurfaceStyles } from "@/components/ui/apple/iosEntryChrome";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { useMinWidth } from "@/hooks/layout/useMinWidth";
import { SyncStatusBeacon } from "../syncUi/SyncStatusDot";
import { SyncStatusDetailPanel } from "../syncUi/SyncStatusDetailPanel";
import { syncDetailContent } from "../syncUi/syncStatusDetailContent";
import {
  SYNC_TONE_CLASSES,
  type SyncTone,
  syncBeaconAriaLabel,
} from "./syncRailDisplay";

interface SyncBlockProps {
  syncStatus: SyncStatus;
  queuedWrites: number;
  message?: string | null;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onSyncErrorAction?: () => void;
  /**
   * overlay: absolute under status bar (Legacy / Mantine fallback)
   * inline: floating sibling Paper
   * segment: control only inside the single status island
   */
  placement?: "overlay" | "inline" | "segment";
  /** Hide segment text (beacon only); also used by narrow gallery frames. */
  compact?: boolean;
}

function surveyShortLabelTone(status: SyncStatus): SyncTone | null {
  switch (status) {
    case "error":
      return "error";
    case "offline":
    case "degraded":
      return "warning";
    case "saving":
      return "info";
    case "synced":
      return null;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function SyncBlock({
  syncStatus,
  queuedWrites,
  message,
  menuOpen,
  onMenuOpenChange,
  onSyncErrorAction,
  placement = "overlay",
  compact = false,
}: SyncBlockProps) {
  const mantinePlayerUi = usePlayerUiMantine();
  const comfortableWidth = useMinWidth(380) && !compact;
  const syncErrorDisplay = userErrorFromSyncMessage(message);
  const shortLabel = surveySyncShortLabel(syncStatus, queuedWrites);
  const segmentLabel = comfortableWidth
    ? surveySyncSegmentLabel(syncStatus, queuedWrites)
    : null;
  const shortLabelTone = surveyShortLabelTone(syncStatus);
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

  const ariaLabel = shortLabel
    ? `${shortLabel}. Show sync details`
    : syncBeaconAriaLabel(syncStatus);

  const detail =
    menuOpen ? (
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
    ) : null;

  const beaconRow = (
    <Group gap={6} wrap="nowrap" justify="center">
      {shortLabel ? (
        <Text
          size="xs"
          fw={590}
          className={
            shortLabelTone ? SYNC_TONE_CLASSES[shortLabelTone].text : undefined
          }
          style={{ maxWidth: "6.5rem", lineHeight: 1.25 }}
        >
          {shortLabel}
        </Text>
      ) : null}
      <SyncStatusBeacon status={syncStatus} size="md" />
    </Group>
  );

  if (mantinePlayerUi && placement === "segment") {
    const statusAria = shortLabel ?? syncBeaconAriaLabel(syncStatus);
    return (
      <div
        className="relative inline-flex min-h-11 min-w-11 max-w-full items-center justify-center overflow-hidden rounded-xl px-1"
        data-testid="sync-block-mantine"
        role="status"
        aria-label={statusAria}
      >
        <Group gap={4} wrap="nowrap" justify="center" style={{ minWidth: 0 }}>
          {segmentLabel ? (
            <Text
              size="xs"
              fw={590}
              className={
                shortLabelTone
                  ? SYNC_TONE_CLASSES[shortLabelTone].text
                  : undefined
              }
              style={{
                maxWidth: "4.75rem",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {segmentLabel}
            </Text>
          ) : null}
          <SyncStatusBeacon status={syncStatus} size="md" />
        </Group>
      </div>
    );
  }

  if (mantinePlayerUi) {
    const inline = placement === "inline";
    return (
      <div
        className={
          inline
            ? "pointer-events-auto relative shrink-0"
            : "jl-sync-map-indicator"
        }
        data-testid="sync-block-mantine"
      >
        <Paper
          component="button"
          type="button"
          radius={shortLabel ? 14 : "xl"}
          className="pointer-events-auto inline-flex min-h-11 items-center justify-center"
          px={shortLabel ? "sm" : 0}
          onClick={() => onMenuOpenChange(!menuOpen)}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-label={ariaLabel}
          styles={{
            root: {
              ...iosMapChromeSurfaceStyles,
              width: shortLabel ? "auto" : "2.75rem",
              height: "2.75rem",
              minWidth: "2.75rem",
              borderRadius: shortLabel ? 14 : 999,
              borderColor: menuOpen
                ? "oklch(from var(--color-flag) l c h / 0.45)"
                : iosMapChromeSurfaceStyles.border,
              backgroundColor: menuOpen
                ? "oklch(from var(--color-flag) l c h / 0.14)"
                : iosMapChromeSurfaceStyles.backgroundColor,
              cursor: "pointer",
            },
          }}
        >
          {beaconRow}
        </Paper>
        {detail}
      </div>
    );
  }

  return (
    <div className="jl-sync-map-indicator">
      <button
        type="button"
        className={`jl-sync-map-indicator__btn inline-flex min-h-11 min-w-11 items-center justify-center border border-rule bg-canvas text-field-ink shadow-none${menuOpen ? " jl-sync-map-indicator__btn--open" : ""}${shortLabel ? " jl-sync-map-indicator__btn--labeled gap-1.5 px-2.5" : ""}`}
        onClick={() => onMenuOpenChange(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
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
      {detail}
    </div>
  );
}
