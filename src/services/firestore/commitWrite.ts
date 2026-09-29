import { waitForPendingWrites, type Firestore } from "firebase/firestore";
import { useWriteLedgerStore, type WriteLabel } from "@/state/writeLedgerStore";
import { addWriteRejectedBreadcrumb } from "@/services/core/analytics/sentry";

/**
 * Fire a Firestore write without blocking UI on server ack.
 *
 * Firestore applies the write to the persisted local cache immediately
 * (listeners fire with hasPendingWrites) and replays it on reconnect; the
 * returned promise resolves only on server ack, so callers must NOT await it
 * to gate UI. `acknowledged` always has a handler attached — no unhandled
 * rejections — and rejections (rules / precondition) land in the ledger.
 */
export function commitWrite(
  label: WriteLabel,
  run: () => Promise<void>,
): { acknowledged: Promise<void> } {
  const id = useWriteLedgerStore.getState().begin(label);
  let pending: Promise<void>;
  try {
    pending = run();
  } catch (error) {
    pending = Promise.reject(error);
  }
  const acknowledged = pending.then(
    () => useWriteLedgerStore.getState().settle(id),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      useWriteLedgerStore.getState().fail(id, message);
      addWriteRejectedBreadcrumb(label, error);
      throw error;
    },
  );
  acknowledged.catch(() => {});
  return { acknowledged };
}

/**
 * Writes queued by a previous page load have no promise to track; represent
 * them as one ledger entry that settles when the SDK drains its queue.
 * `waitForPendingWrites` resolves immediately when nothing was queued.
 */
export function trackRestoredWrites(db: Firestore): void {
  const id = useWriteLedgerStore.getState().begin("restored");
  const settle = () => useWriteLedgerStore.getState().settle(id);
  waitForPendingWrites(db).then(settle, settle);
}
