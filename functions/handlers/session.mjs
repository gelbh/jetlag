import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { isSessionMember } from "../proxies/verifyProxyAccess.mjs";
import { resetSessionForRematchHandler } from "../session/resetSessionForRematch.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const resetSessionForRematch = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const sessionId =
      typeof request.data?.sessionId === "string" ? request.data.sessionId : "";

    if (!sessionId) {
      throw new HttpsError("invalid-argument", "sessionId is required.");
    }

    const db = getFirestore();
    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      throw new HttpsError("not-found", "Session not found.");
    }

    if (!isSessionMember(sessionSnap.data(), request.auth.uid)) {
      throw new HttpsError("permission-denied", "Session membership required.");
    }

    try {
      await resetSessionForRematchHandler(db, request.auth.uid, sessionId);
    } catch (error) {
      if (error instanceof Error && error.message === "Session not found.") {
        throw new HttpsError("not-found", error.message);
      }
      throw error;
    }

    return { ok: true };
  }),
);
