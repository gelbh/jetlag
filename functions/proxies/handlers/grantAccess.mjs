import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import { adminAuth } from "../../handlers/proxyShared.mjs";
import {
  clearGrantAccessFailures,
  getGrantAccessFailureCount,
  recordGrantAccessFailure,
} from "../../lib/firestoreRateLimit.mjs";
import {
  getSentryDsnSecret,
  withSentryEventHandler,
} from "../../lib/sentry.mjs";

const accessCodeSecret = defineSecret("ACCESS_CODE");
const sentryDsnSecret = getSentryDsnSecret();

const GRANT_ACCESS_FAILURE_DELAY_MS = 300;
const GRANT_ACCESS_MAX_FAILURES = 8;
const GRANT_ACCESS_WINDOW_MS = 15 * 60 * 1000;

function adminDb() {
  return getFirestore();
}

export const grantAccess = onCall(
  {
    secrets: [accessCodeSecret, sentryDsnSecret],
    enforceAppCheck: true,
  },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const uid = request.auth.uid;
    const failures = await getGrantAccessFailureCount(adminDb(), uid, {
      windowMs: GRANT_ACCESS_WINDOW_MS,
    });
    if (failures >= GRANT_ACCESS_MAX_FAILURES) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many attempts. Try again later.",
      );
    }

    const code =
      typeof request.data?.code === "string" ? request.data.code.trim() : "";
    if (!code) {
      throw new HttpsError("invalid-argument", "Access code required.");
    }

    const expected = accessCodeSecret.value();
    if (!expected || code !== expected) {
      await recordGrantAccessFailure(adminDb(), uid, {
        maxFailures: GRANT_ACCESS_MAX_FAILURES,
        windowMs: GRANT_ACCESS_WINDOW_MS,
      });
      await new Promise((resolve) => {
        setTimeout(resolve, GRANT_ACCESS_FAILURE_DELAY_MS);
      });
      throw new HttpsError("permission-denied", "Invalid access code.");
    }

    await clearGrantAccessFailures(adminDb(), uid);
    await adminAuth().setCustomUserClaims(uid, { access: true });
    return { granted: true };
  }),
);
