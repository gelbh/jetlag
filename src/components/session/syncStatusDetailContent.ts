import type { SyncStatus } from "../../domain/device/sync";
import type { UserErrorDisplay } from "../../domain/device/userErrors";

export type SyncTone = "error" | "warning" | "info";

export function syncToneForStatus(status: SyncStatus): SyncTone {
  if (status === "error") {
    return "error";
  }
  if (status === "offline" || status === "degraded") {
    return "warning";
  }
  return "info";
}

export function syncDetailContent(
  status: SyncStatus,
  queuedWrites: number,
  message?: string | null,
  errorDisplay?: UserErrorDisplay | null,
): { title: string; body: string; tone: SyncTone } {
  if (errorDisplay) {
    return {
      title: errorDisplay.title,
      body: errorDisplay.message,
      tone: syncToneForStatus(status),
    };
  }

  if (message) {
    return {
      title: "Sync",
      body: message,
      tone: syncToneForStatus(status),
    };
  }

  switch (status) {
    case "synced":
      return {
        title: "Synced",
        body: "Up to date on this device.",
        tone: "info",
      };
    case "saving":
      return {
        title: "Saving…",
        body: "Sending changes to the session.",
        tone: "info",
      };
    case "offline":
      return {
        title: "Offline",
        body:
          queuedWrites > 0
            ? `${queuedWrites} change${queuedWrites === 1 ? "" : "s"} queued.`
            : "Will sync when you reconnect.",
        tone: "warning",
      };
    case "degraded":
      return {
        title: "Unstable",
        body:
          queuedWrites > 0
            ? `${queuedWrites} change${queuedWrites === 1 ? "" : "s"} queued.`
            : "Sync may lag until connection improves.",
        tone: "warning",
      };
    case "error":
      return {
        title: "Sync failed",
        body: "Could not reach the session.",
        tone: "error",
      };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
