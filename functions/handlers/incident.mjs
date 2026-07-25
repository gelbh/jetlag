import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { consumeRateLimit } from "../lib/firestoreRateLimit.mjs";
import {
  isAdminAuth,
  requireAdminAuth,
  resolveAdminEmail,
} from "../admin/adminAccess.mjs";
import {
  cancelOpenPendingQuestions,
  moderateSession,
} from "../admin/moderateSession.mjs";
import {
  createIncidentHandler,
  INCIDENT_INVALID_DIAGNOSTICS,
  INCIDENT_PAYLOAD_TOO_LARGE,
  INCIDENT_RATE_LIMITED,
  INCIDENT_UNAUTHENTICATED,
} from "../incident/createIncident.mjs";
import { sendIncidentEmail } from "../incident/sendIncidentEmail.mjs";
import {
  INCIDENT_FORBIDDEN,
  INCIDENT_INVALID_MESSAGE,
  INCIDENT_NOT_FOUND,
  postIncidentMessageHandler,
} from "../incident/postIncidentMessage.mjs";
import {
  applyIncidentMitigationHandler,
  INCIDENT_INVALID_MITIGATION,
  INCIDENT_NO_SESSION,
} from "../incident/applyIncidentMitigation.mjs";
import {
  INCIDENT_HOTFIX_VERSION_TOO_LOW,
  INCIDENT_INVALID_HOTFIX_VERSION,
  publishIncidentHotfixHandler,
} from "../incident/publishIncidentHotfix.mjs";

const sentryDsnSecret = getSentryDsnSecret();
const incidentEmailSecret = defineSecret("INCIDENT_EMAIL_SECRET");
const incidentWorkerBaseUrl = defineString("INCIDENT_WORKER_BASE_URL", {
  default: "https://jetlag.gelbhart.dev",
});

function mapIncidentError(error) {
  if (!(error instanceof Error)) {
    throw error;
  }
  switch (error.message) {
    case INCIDENT_UNAUTHENTICATED:
      throw new HttpsError("unauthenticated", "Sign in required.");
    case INCIDENT_INVALID_DIAGNOSTICS:
      throw new HttpsError("invalid-argument", "Invalid diagnostics payload.");
    case INCIDENT_PAYLOAD_TOO_LARGE:
      throw new HttpsError("invalid-argument", "Diagnostics payload too large.");
    case INCIDENT_RATE_LIMITED:
      throw new HttpsError(
        "resource-exhausted",
        "Too many reports. Please wait a few minutes and try again.",
      );
    case INCIDENT_NOT_FOUND:
      throw new HttpsError("not-found", "Incident not found.");
    case INCIDENT_FORBIDDEN:
      throw new HttpsError(
        "permission-denied",
        "You do not have access to this incident.",
      );
    case INCIDENT_INVALID_MESSAGE:
      throw new HttpsError("invalid-argument", "Invalid message.");
    case INCIDENT_INVALID_MITIGATION:
      throw new HttpsError("invalid-argument", "Invalid mitigation type.");
    case INCIDENT_NO_SESSION:
      throw new HttpsError(
        "failed-precondition",
        "Incident has no linked session.",
      );
    case INCIDENT_INVALID_HOTFIX_VERSION:
      throw new HttpsError(
        "invalid-argument",
        "Hotfix version must be four-segment (x.y.z.n).",
      );
    case INCIDENT_HOTFIX_VERSION_TOO_LOW:
      throw new HttpsError(
        "invalid-argument",
        "Hotfix version must be greater than or equal to the reported app version.",
      );
    default:
      throw error;
  }
}

export const createIncident = onCall(
  { secrets: [sentryDsnSecret, incidentEmailSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();
    const workerBaseUrl = incidentWorkerBaseUrl.value();
    const secret = incidentEmailSecret.value();
    const adminEmail = resolveAdminEmail();

    try {
      return await createIncidentHandler(
        db,
        {
          uid: request.auth.uid,
          reporterRole: request.data?.reporterRole ?? null,
          playerNote: request.data?.playerNote ?? null,
          diagnostics: request.data?.diagnostics,
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
          incidentUrlBase: workerBaseUrl,
        },
      );
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);

export const postIncidentMessage = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();
    try {
      return await postIncidentMessageHandler(db, {
        incidentId: request.data?.incidentId,
        uid: request.auth.uid,
        isAdmin: isAdminAuth(request.auth),
        text: request.data?.text,
      });
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);

export const applyIncidentMitigation = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    requireAdminAuth(request.auth);

    const db = getFirestore();
    try {
      return await applyIncidentMitigationHandler(
        db,
        {
          incidentId: request.data?.incidentId,
          type: request.data?.type,
          uid: request.auth.uid,
          note: request.data?.note,
        },
        {
          moderate: (sessionId, action, adminUid) =>
            moderateSession(db, sessionId, action, adminUid),
          clearPendingQuestions: (sessionId) =>
            cancelOpenPendingQuestions(db, sessionId),
        },
      );
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);

export const publishIncidentHotfix = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    requireAdminAuth(request.auth);

    const db = getFirestore();
    try {
      return await publishIncidentHotfixHandler(db, {
        incidentId: request.data?.incidentId,
        toVersion: request.data?.toVersion,
        graceSeconds: request.data?.graceSeconds,
        uid: request.auth.uid,
      });
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);
