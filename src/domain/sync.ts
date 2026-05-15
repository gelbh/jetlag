export type SyncStatus = "synced" | "saving" | "offline" | "error";

export function resolveSyncStatus(input: {
  online: boolean;
  inFlightWrites: number;
  queuedWrites: number;
  lastSyncError: string | null;
}): SyncStatus {
  if (input.lastSyncError) {
    return "error";
  }

  if (input.inFlightWrites > 0) {
    return "saving";
  }

  if (!input.online || input.queuedWrites > 0) {
    return "offline";
  }

  return "synced";
}
