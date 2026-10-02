import { isEffectivelyOffline } from "@/domain/device/sync/sync";
import { useSessionStore } from "@/state/sessionStore";

/** Snapshot of browser online state + reachability probe, outside React render. */
export function isEffectivelyOfflineNow(): boolean {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  return isEffectivelyOffline({
    online,
    reachable: useSessionStore.getState().networkReachable,
  });
}
