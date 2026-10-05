import { isBrowserOnline, isEffectivelyOffline } from "@/domain/device/sync/sync";
import { useSessionStore } from "@/state/sessionStore";

/** Browser online flag + last reachability probe, read outside React. */
export function isDeviceEffectivelyOffline(): boolean {
  return isEffectivelyOffline({
    online: isBrowserOnline(),
    reachable: useSessionStore.getState().networkReachable,
  });
}
