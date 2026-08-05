/** Preload-request callable wiring — export name must stay `createPreloadRequest`. */
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { withSentryEventHandler } from "../lib/sentry.mjs";
import { consumeRateLimit } from "../lib/firestoreRateLimit.mjs";
import { resolveAdminEmail } from "../admin/adminAccess.mjs";
import { sendIncidentEmail } from "../incident/sendIncidentEmail.mjs";
import {
  createPreloadRequestHandler,
  PRELOAD_INVALID_SNAPSHOT,
  PRELOAD_PAYLOAD_TOO_LARGE,
  PRELOAD_RATE_LIMITED,
  PRELOAD_UNAUTHENTICATED,
} from "../preloadRequest/createPreloadRequest.mjs";
import {
  incidentEmailSecret,
  incidentWorkerBaseUrl,
  sentryDsnSecret,
} from "./incident/shared.mjs";

function mapPreloadError(error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  switch (error.message) {
    case PRELOAD_UNAUTHENTICATED:
      throw new HttpsError("unauthenticated", "Sign in required.");
    case PRELOAD_INVALID_SNAPSHOT:
      throw new HttpsError("invalid-argument", "Invalid preset snapshot.");
    case PRELOAD_PAYLOAD_TOO_LARGE:
      throw new HttpsError("invalid-argument", "Preset snapshot too large.");
    case PRELOAD_RATE_LIMITED:
      throw new HttpsError(
        "resource-exhausted",
        "Too many preload requests. Please wait a few minutes and try again.",
      );
    default:
      throw error;
  }
}

export const createPreloadRequest = onCall(
  {
    secrets: [sentryDsnSecret, incidentEmailSecret],
    enforceAppCheck: true,
  },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();
    const workerBaseUrl = incidentWorkerBaseUrl.value();
    const secret = incidentEmailSecret.value();
    const adminEmail = resolveAdminEmail();

    try {
      return await createPreloadRequestHandler(
        db,
        {
          uid: request.auth.uid,
          note: request.data?.note ?? null,
          presetSnapshot: request.data?.presetSnapshot,
        },
        {
          rateLimit: (options) => consumeRateLimit(db, options),
          sendEmail: ({ subject, text, incidentUrl }) =>
            sendIncidentEmail({
              workerBaseUrl,
              secret,
              adminEmail,
              subject,
              text,
              incidentUrl,
            }),
          requestUrlBase: workerBaseUrl,
        },
      );
    } catch (error) {
      mapPreloadError(error);
    }
  }),
);
