import { disableNetwork, enableNetwork } from "firebase/firestore";
import { getFirestoreDb } from "@/services/core/firebase/firebase";

const ENABLE_RETRY_DELAYS_MS = [0, 1_000, 3_000] as const;

let cycling = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function enableWithRetry(db: ReturnType<typeof getFirestoreDb>): Promise<void> {
  for (const delayMs of ENABLE_RETRY_DELAYS_MS) {
    if (delayMs > 0) await sleep(delayMs);
    try {
      await enableNetwork(db);
      return;
    } catch {
      // Retry below: leaving Firestore disabled would strand the session offline.
    }
  }
}

/**
 * Restart Firestore's streams (`disableNetwork` → `enableNetwork`) to unstick
 * listeners after an OS resume the SDK didn't notice. Pending writes stay in
 * the persisted mutation queue and flush on re-enable.
 *
 * Re-enable always runs once a cycle starts, with retries, and overlapping
 * calls are dropped so no stray disable lands between another cycle's
 * disable and enable. Resolves `false` when skipped.
 */
export async function cycleFirestoreNetwork(): Promise<boolean> {
  if (cycling) return false;
  cycling = true;
  const db = getFirestoreDb();
  try {
    await disableNetwork(db).catch(() => {});
  } finally {
    await enableWithRetry(db);
    cycling = false;
  }
  return true;
}
