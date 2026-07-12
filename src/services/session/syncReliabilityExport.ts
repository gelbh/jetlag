import { isEffectivelyOffline } from "../../domain/device/sync";
import { isFirestorePersistenceUnavailable } from "../core/firebase";
import { countOfflineQueueForSession } from "./offlineQueue";
import { useSessionStore } from "../../state/sessionStore";

export interface SyncReliabilitySnapshot {
  capturedAt: string;
  sessionId: string | null;
  pendingWrites: number;
  lastSyncError: string | null;
  networkReachable: boolean | null;
  effectivelyOffline: boolean;
  firestorePersistenceUnavailable: boolean;
  online: boolean;
  platform: string | null;
  queuedAnnotationWrites: number;
}

export async function captureSyncReliabilitySnapshot(): Promise<SyncReliabilitySnapshot> {
  const {
    session,
    pendingWrites,
    lastSyncError,
    networkReachable,
  } = useSessionStore.getState();
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const sessionId = session?.id ?? null;

  return {
    capturedAt: new Date().toISOString(),
    sessionId,
    pendingWrites,
    lastSyncError,
    networkReachable,
    effectivelyOffline: isEffectivelyOffline({ online, reachable: networkReachable }),
    firestorePersistenceUnavailable: isFirestorePersistenceUnavailable(),
    online,
    platform: typeof navigator === "undefined" ? null : navigator.userAgent,
    queuedAnnotationWrites:
      sessionId === null ? 0 : await countOfflineQueueForSession(sessionId),
  };
}

export async function copySyncReliabilitySnapshot(): Promise<void> {
  const snapshot = await captureSyncReliabilitySnapshot();
  const text = JSON.stringify(snapshot, null, 2);

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  throw new Error("Clipboard unavailable.");
}
