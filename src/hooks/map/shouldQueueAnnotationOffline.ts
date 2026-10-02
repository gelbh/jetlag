import { isEffectivelyOfflineNow } from "@/hooks/sync/isEffectivelyOfflineNow";

export function shouldQueueAnnotationOffline(): boolean {
  return isEffectivelyOfflineNow();
}
