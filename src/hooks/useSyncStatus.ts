import { useEffect, useState } from "react";
import { resolveSyncStatus, type SyncStatus } from "../domain/sync";
import { useSessionStore } from "../state/sessionStore";

export function useSyncStatus(): {
  status: SyncStatus;
  queuedWrites: number;
  lastSyncError: string | null;
  remoteUpdateNotice: string | null;
} {
  const pendingWrites = useSessionStore((state) => state.pendingWrites);
  const syncInFlight = useSessionStore((state) => state.syncInFlight);
  const lastSyncError = useSessionStore((state) => state.lastSyncError);
  const remoteUpdateNotice = useSessionStore(
    (state) => state.remoteUpdateNotice,
  );
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    status: resolveSyncStatus({
      online,
      inFlightWrites: syncInFlight,
      queuedWrites: pendingWrites,
      lastSyncError,
    }),
    queuedWrites: pendingWrites,
    lastSyncError,
    remoteUpdateNotice,
  };
}
