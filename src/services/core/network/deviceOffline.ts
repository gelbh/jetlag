import { isBrowserOnline, isEffectivelyOffline } from "@/domain/device/sync/sync";
import { useSessionStore } from "@/state/sessionStore";

export function isDeviceEffectivelyOffline(): boolean {
  return isEffectivelyOffline({
    online: isBrowserOnline(),
    reachable: useSessionStore.getState().networkReachable,
  });
}
