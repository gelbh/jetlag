/**
 * Offline, every location `setDoc` lands in Firestore's persisted mutation
 * queue and replays on reconnect. Cap the queue at one unacked location write:
 * while effectively offline, newer readings replace the pending one in memory
 * and are published once the in-flight write acks (latest-only).
 */
export function shouldPublishLocationNow(input: {
  effectivelyOffline: boolean;
  hasUnackedLocationWrite: boolean;
}): boolean {
  return !(input.effectivelyOffline && input.hasUnackedLocationWrite);
}
