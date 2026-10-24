export type SyncStatus = "synced" | "saving" | "offline" | "degraded" | "stale" | "error";

export function isBrowserOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

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
  ledgerPending: number;
  fromCache: boolean;
  lastSyncError: string | null;
}): SyncStatus {
  if (input.lastSyncError) {
    return "error";
  }

  const hasQueued = input.queuedWrites > 0 || input.ledgerPending > 0;
  if (!input.online || (isEffectivelyOffline(input) && hasQueued)) {
    return "offline";
  }

  if (input.inFlightWrites > 0 || input.ledgerPending > 0) {
    return "saving";
  }

  if (input.queuedWrites > 0) {
    return "offline";
  }

  if (input.reachable === false) {
    return "degraded";
  }

  if (input.fromCache) {
    return "stale";
  }

  return "synced";
}
