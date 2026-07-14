import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase";

export async function resetSessionForRematch(sessionId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<{ sessionId: string }, { ok: boolean }>(
    functions,
    "resetSessionForRematch",
  );
  await callable({ sessionId });
}
