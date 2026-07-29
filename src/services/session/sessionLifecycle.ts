import { httpsCallable } from "firebase/functions";
import { trackSessionEnded } from "../core/analytics/analytics";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase/firebase";

export type LeaveHostSessionResult =
  | { action: "promoted"; newHostUid: string }
  | { action: "ended" };

export async function leaveHostSession(
  sessionId: string,
): Promise<LeaveHostSessionResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<{ sessionId: string }, LeaveHostSessionResult>(
    functions,
    "leaveHostSession",
  );
  const result = await callable({ sessionId });
  return result.data;
}

export async function endSession(sessionId: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<{ sessionId: string }, { ok: boolean }>(
    functions,
    "endSession",
  );
  await callable({ sessionId });
  trackSessionEnded("host_end");
}
