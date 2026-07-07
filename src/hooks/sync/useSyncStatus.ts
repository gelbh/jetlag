import { useEffect, useState } from "react";
import { LOCAL_SESSION_ID } from "../domain/annotations";
import { getPowerProfile } from "../domain/powerProfile";
import { resolveSyncStatus, type SyncStatus } from "../domain/sync";
import { useReachability } from "./useReachability";
import { useMapStore } from "../state/mapStore";
import { useSessionStore } from "../state/sessionStore";

export function useSyncStatus(): {
  status: SyncStatus;
  queuedWrites: number;
  lastSyncError: string | null;
  remoteUpdateNotice: string | null;
} {
  const session = useSessionStore((state) => state.session);
  const pendingWrites = useSessionStore((state) => state.pendingWrites);
  const syncInFlight = useSessionStore((state) => state.syncInFlight);
  const lastSyncError = useSessionStore((state) => state.lastSyncError);
  const remoteUpdateNotice = useSessionStore(
    (state) => state.remoteUpdateNotice,
  );
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const reachabilityEnabled =
    Boolean(session) &&
    session?.id !== LOCAL_SESSION_ID;
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const reachabilityProbeMs = getPowerProfile(lowPowerMode).reachabilityProbeMs;
  const { reachable } = useReachability(reachabilityEnabled, reachabilityProbeMs);

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
      reachable,
      inFlightWrites: syncInFlight,
      queuedWrites: pendingWrites,
      lastSyncError,
    }),
    queuedWrites: pendingWrites,
    lastSyncError,
    remoteUpdateNotice,
  };
}
