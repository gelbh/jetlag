import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase";

export type AdminModerationAction = "end" | "resetBoard" | "cleanupCode";

interface AdminModerateSessionRequest {
  sessionId: string;
  action: AdminModerationAction;
}

interface AdminModerateSessionResponse {
  ok: true;
}

export async function adminModerateSession(
  sessionId: string,
  action: AdminModerationAction,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    AdminModerateSessionRequest,
    AdminModerateSessionResponse
  >(functions, "adminModerateSession");

  await callable({ sessionId, action });
}
