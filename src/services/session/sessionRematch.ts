import { getToken } from "firebase/app-check";
import { httpsCallable } from "firebase/functions";
import {
  getFirebaseAppCheck,
  getFirebaseFunctions,
  isFirebaseConfigured,
} from "../core/firebase/firebase";
import { captureAppCheckTokenFailure } from "../core/analytics/sentry";

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

export async function resetSessionForRematch(sessionId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  await ensureAppCheckTokenForCallable();
  const callable = httpsCallable<{ sessionId: string }, { ok: boolean }>(
    functions,
    "resetSessionForRematch",
  );
  await callable({ sessionId });
}
