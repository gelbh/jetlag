/** Preload-request callables — preserve export names `createPreloadRequest` / `updatePreloadRequestStatus`. */
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { withSentryEventHandler } from "../lib/sentry.mjs";
import { consumeRateLimit } from "../lib/firestoreRateLimit.mjs";
import { requireAdminAuth, resolveAdminEmail } from "../admin/adminAccess.mjs";
import { sendIncidentEmail } from "../incident/sendIncidentEmail.mjs";
import {
  createPreloadRequestHandler,
  PRELOAD_INVALID_SNAPSHOT,
  PRELOAD_PAYLOAD_TOO_LARGE,
  PRELOAD_PERMANENT_AUTH_REQUIRED,
  PRELOAD_RATE_LIMITED,
  PRELOAD_UNAUTHENTICATED,
} from "../preloadRequest/createPreloadRequest.mjs";
import {
  PRELOAD_INVALID_STATUS,
  PRELOAD_INVALID_TRANSITION,
  PRELOAD_REQUEST_NOT_FOUND,
  updatePreloadRequestStatusHandler,
} from "../preloadRequest/updatePreloadRequestStatus.mjs";
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
    case PRELOAD_PERMANENT_AUTH_REQUIRED:
      throw new HttpsError(
        "failed-precondition",
        "Sign in with Google or email to submit a preload request.",
      );
    case PRELOAD_INVALID_SNAPSHOT:
      throw new HttpsError("invalid-argument", "Invalid preset snapshot.");
    case PRELOAD_PAYLOAD_TOO_LARGE:
      throw new HttpsError("invalid-argument", "Preset snapshot too large.");
    case PRELOAD_RATE_LIMITED:
      throw new HttpsError(
        "resource-exhausted",
        "Too many preload requests. Please wait a few minutes and try again.",
      );
    case PRELOAD_REQUEST_NOT_FOUND:
      throw new HttpsError("not-found", "Preload request not found.");
    case PRELOAD_INVALID_STATUS:
      throw new HttpsError("invalid-argument", "Invalid preload request status.");
    case PRELOAD_INVALID_TRANSITION:
      throw new HttpsError(
        "failed-precondition",
        "That status transition is not allowed.",
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
          signInProvider: request.auth.token?.firebase?.sign_in_provider,
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

export const updatePreloadRequestStatus = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    requireAdminAuth(request.auth);

    const db = getFirestore();
    try {
      return await updatePreloadRequestStatusHandler(db, {
        requestId: request.data?.requestId,
        status: request.data?.status,
        uid: request.auth.uid,
      });
    } catch (error) {
      mapPreloadError(error);
    }
  }),
);
