import { Group, Paper, Text } from "@mantine/core";
import type { SyncStatus } from "@/domain/device/sync/sync";
import {
  surveySyncSegmentLabel,
  surveySyncShortLabel,
} from "@/domain/device/surveyStatusCopy";
import { iosMapChromeSurfaceStyles } from "@/components/ui/apple/iosEntryChrome";
import { useMinWidth } from "@/hooks/layout/useMinWidth";
import { SyncStatusBeacon } from "../syncUi/SyncStatusDot";
import {
  SYNC_TONE_CLASSES,
  type SyncTone,
  syncBeaconAriaLabel,
} from "./syncRailDisplay";

interface SyncBlockProps {
  syncStatus: SyncStatus;
  queuedWrites: number;
  message?: string | null;
  /** @deprecated Detail modal removed; ignored. */
  menuOpen?: boolean;
  /** @deprecated Detail modal removed; ignored. */
  onMenuOpenChange?: (open: boolean) => void;
  /** @deprecated Detail modal removed; ignored. */
  onSyncErrorAction?: () => void;
  /**
   * overlay: absolute under status bar
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

/** Live sync beacon in the status rail (display only; no detail modal). */
export function SyncBlock({
  syncStatus,
  queuedWrites,
  placement = "overlay",
  compact = false,
}: SyncBlockProps) {
  const comfortableWidth = useMinWidth(380) && !compact;
  const shortLabel = surveySyncShortLabel(syncStatus, queuedWrites);
  const segmentLabel = comfortableWidth
    ? surveySyncSegmentLabel(syncStatus, queuedWrites)
    : null;
  const shortLabelTone = surveyShortLabelTone(syncStatus);
  const statusAria = shortLabel ?? syncBeaconAriaLabel(syncStatus);

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

  if (placement === "segment") {
    return (
      <div
        className="relative inline-flex min-h-11 min-w-11 max-w-full items-center justify-center overflow-visible rounded-xl px-1"
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
        radius={shortLabel ? 14 : "xl"}
        className="pointer-events-none inline-flex min-h-11 items-center justify-center"
        px={shortLabel ? "sm" : 0}
        role="status"
        aria-label={statusAria}
        styles={{
          root: {
            ...iosMapChromeSurfaceStyles,
            width: shortLabel ? "auto" : "2.75rem",
            height: "2.75rem",
            minWidth: "2.75rem",
            borderRadius: shortLabel ? 14 : 999,
            cursor: "default",
          },
        }}
      >
        {beaconRow}
      </Paper>
    </div>
  );
}
