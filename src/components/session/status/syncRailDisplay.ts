import type { SyncStatus } from "../../../domain/device/sync";
import type { PlayerRole } from "../../../domain/session/playerRole";
import { syncToneForStatus } from "../syncStatusDetailContent";

export type SyncTone = "error" | "warning" | "info";

export const SYNC_TONE_CLASSES: Record<
  SyncTone,
  { text: string; surface: string; border: string }
> = {
  error: {
    text: "text-status-error",
    surface: "bg-status-error-surface",
    border: "border-status-error/40",
  },
  warning: {
    text: "text-status-warning",
    surface: "bg-status-warning-surface",
    border: "border-status-warning/40",
  },
  info: {
    text: "text-status-info",
    surface: "bg-status-info-surface",
    border: "border-status-info/40",
  },
};

export function syncRailDisplay(
  status: SyncStatus,
  queuedWrites: number,
  message?: string | null,
): {
  inline: { visible: boolean; label: string | null; tone: SyncTone } | null;
  banner: { visible: boolean; label: string; tone: SyncTone } | null;
} {
  if (message) {
    const tone = syncToneForStatus(status);
    return {
      inline: null,
      banner: { visible: true, label: message, tone },
    };
  }

  if (status === "error") {
    return {
      inline: {
        visible: true,
        label: "Sync failed",
        tone: "error",
      },
      banner: null,
    };
  }

  if (status === "offline") {
    return {
      inline: {
        visible: true,
        label:
          queuedWrites > 0
            ? `Offline · ${queuedWrites} queued`
            : "Offline",
        tone: "warning",
      },
      banner: null,
    };
  }

  if (status === "degraded") {
    return {
      inline: {
        visible: true,
        label:
          queuedWrites > 0
            ? `Unstable · ${queuedWrites} queued`
            : "Unstable",
        tone: "warning",
      },
      banner: null,
    };
  }

  if (status === "saving") {
    return {
      inline: {
        visible: true,
        label: "Saving…",
        tone: "info",
      },
      banner: null,
    };
  }

  return { inline: null, banner: null };
}

export function idleModeLabel(playerRole: PlayerRole): string {
  if (playerRole === "hider") {
    return "Set your zone";
  }
  if (playerRole === "observer" || playerRole === "admin") {
    return "Observing";
  }
  return "Ready to seek";
}

export function syncBeaconAriaLabel(status: SyncStatus): string {
  switch (status) {
    case "synced":
      return "Synced. Show sync details";
    case "saving":
      return "Saving changes. Show sync details";
    case "offline":
      return "Offline. Show sync details";
    case "degraded":
      return "Unstable connection. Show sync details";
    case "error":
      return "Sync failed. Show sync details";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
