export type UserErrorAction = "retry" | "rejoin" | "settings" | "copy_debug";

export interface UserErrorDisplay {
  title: string;
  message: string;
  action?: UserErrorAction;
  actionLabel?: string;
}

export function formatUserError(
  code: string,
  fallbackMessage?: string | null,
): UserErrorDisplay {
  switch (code) {
    case "sync_offline":
      return {
        title: "Offline",
        message: "Changes will sync when you reconnect.",
        action: "retry",
        actionLabel: "Retry",
      };
    case "sync_failed":
      return {
        title: "Sync failed",
        message: fallbackMessage ?? "Could not sync with the session.",
        action: "retry",
        actionLabel: "Retry",
      };
    case "gps_denied":
      return {
        title: "Location blocked",
        message: "Turn on location access in your browser settings.",
        action: "settings",
        actionLabel: "Open settings",
      };
    case "photo_upload":
      return {
        title: "Photo upload failed",
        message: fallbackMessage ?? "Could not upload the photo.",
        action: "retry",
        actionLabel: "Try again",
      };
    case "session_gone":
      return {
        title: "Session ended",
        message: "This session is no longer available.",
        action: "rejoin",
        actionLabel: "Back to home",
      };
    default:
      return {
        title: "Something went wrong",
        message: fallbackMessage ?? "Try again.",
        action: "retry",
        actionLabel: "Retry",
      };
  }
}

export function userErrorFromSyncMessage(
  message: string | null | undefined,
): UserErrorDisplay | null {
  if (!message) {
    return null;
  }

  if (/offline/i.test(message)) {
    return formatUserError("sync_offline", message);
  }

  if (/sync failed|permission/i.test(message)) {
    return formatUserError("sync_failed", message);
  }

  return formatUserError("unknown", message);
}
