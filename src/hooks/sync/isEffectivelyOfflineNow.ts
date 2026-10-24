import { isEffectivelyOffline } from "@/domain/device/sync/sync";
import { useSessionStore } from "@/state/sessionStore";

export function isEffectivelyOfflineNow(): boolean {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  return isEffectivelyOffline({
    online,
    reachable: useSessionStore.getState().networkReachable,
  });
}
