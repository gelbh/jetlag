import { type Firestore, waitForPendingWrites } from "firebase/firestore";
import { useWriteLedgerStore, type WriteLabel } from "@/state/writeLedgerStore";

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
    () => useWriteLedgerStore.getState().remove(id),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      useWriteLedgerStore.getState().fail(id, message);
      throw error;
    },
  );
  acknowledged.catch(() => {});
  return { acknowledged };
}

/** Only show the restored entry if the SDK queue has not drained by then (avoids a boot "Saving…" flash). */
export const RESTORED_WRITES_GRACE_MS = 250;

const trackedDbs = new WeakSet<Firestore>();

/**
 * Writes queued by a previous page load have no promise to track. Represent
 * them as ONE ledger entry (the SDK does not expose a count, so N restored
 * writes read as 1) that clears when the SDK drains its queue.
 * `waitForPendingWrites` resolves immediately when nothing was queued, so the
 * entry only appears when restored writes are actually outstanding. Idempotent
 * per Firestore instance; never throws.
 */
export function trackRestoredWrites(db: Firestore): void {
  if (trackedDbs.has(db)) {
    return;
  }
  trackedDbs.add(db);

  let drained: Promise<void>;
  try {
    drained = waitForPendingWrites(db);
  } catch {
    return;
  }

  let id: string | null = null;
  let settled = false;
  const timer = setTimeout(() => {
    if (!settled) {
      id = useWriteLedgerStore.getState().begin("restored");
    }
  }, RESTORED_WRITES_GRACE_MS);
  const settle = () => {
    settled = true;
    clearTimeout(timer);
    if (id) {
      useWriteLedgerStore.getState().remove(id);
    }
  };
  drained.then(settle, settle);
}
