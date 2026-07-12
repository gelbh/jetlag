import { isEffectivelyOffline } from "../../domain/device/sync";
import { useSessionStore } from "../../state/sessionStore";

export function shouldQueueAnnotationOffline(): boolean {
  const networkReachable = useSessionStore.getState().networkReachable;
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  return isEffectivelyOffline({ online, reachable: networkReachable });
}
