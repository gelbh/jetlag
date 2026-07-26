export type SyncStatus = "synced" | "saving" | "offline" | "degraded" | "error";

export function isEffectivelyOffline(input: {
  online: boolean;
  reachable: boolean | null;
}): boolean {
  if (!input.online) {
    return true;
  }

  return input.reachable === false;
}

export function resolveSyncStatus(input: {
  online: boolean;
  reachable: boolean | null;
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

  if (input.reachable === false) {
    return "degraded";
  }

  return "synced";
}
