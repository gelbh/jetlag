import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import {
  REMATCH_NOT_MEMBER,
  REMATCH_SESSION_NOT_FOUND,
  resetSessionForRematchHandler,
} from "../session/resetSessionForRematch.mjs";

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

    try {
      await resetSessionForRematchHandler(db, request.auth.uid, sessionId);
    } catch (error) {
      if (error instanceof Error && error.message === REMATCH_SESSION_NOT_FOUND) {
        throw new HttpsError("not-found", "Session not found.");
      }
      if (error instanceof Error && error.message === REMATCH_NOT_MEMBER) {
        throw new HttpsError("permission-denied", "Session membership required.");
      }
      throw error;
    }

    return { ok: true };
  }),
);
