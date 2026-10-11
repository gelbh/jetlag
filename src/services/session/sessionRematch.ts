import { getToken } from "firebase/app-check";
import { captureAppCheckTokenFailure } from "../core/analytics/clientErrors";
import { callWithResilience } from "../core/firebase/callWithResilience";
import { getFirebaseAppCheck, isFirebaseConfigured } from "../core/firebase/firebase";

/**
 * Prime App Check before enforceAppCheck callables. Lazy App Check init on the
 * first Functions use can race the callable request after a long Firestore-only
 * map session (game over → rematch is a common first-callable path).
 */
async function ensureAppCheckTokenForCallable(): Promise<void> {
  const appCheck = getFirebaseAppCheck();
  if (!appCheck) {
    return;
  }

  try {
    await getToken(appCheck, false);
  } catch (error) {
    captureAppCheckTokenFailure(error, { source: "resetSessionForRematch" });
  }
}

const REMATCH_TIMEOUT_MS = 30_000;

export async function resetSessionForRematch(sessionId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  // Idempotent: the handler returns "idle" when the round was already reset.
  // Batch-heavy (round extras), so allow a longer wait. App Check is primed
  // after Functions init (which arms it) and after the offline gate.
  await callWithResilience<{ sessionId: string }, { ok: boolean }>(
    "resetSessionForRematch",
    { sessionId },
    {
      idempotent: true,
      timeoutMs: REMATCH_TIMEOUT_MS,
      prepare: ensureAppCheckTokenForCallable,
    },
  );
}
