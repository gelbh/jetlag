import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { consumeRateLimit } from "../lib/firestoreRateLimit.mjs";
import { resolveAdminEmail } from "../admin/adminAccess.mjs";
import {
  createIncidentHandler,
  INCIDENT_INVALID_DIAGNOSTICS,
  INCIDENT_PAYLOAD_TOO_LARGE,
  INCIDENT_RATE_LIMITED,
  INCIDENT_UNAUTHENTICATED,
} from "../incident/createIncident.mjs";
import { sendIncidentEmail } from "../incident/sendIncidentEmail.mjs";

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
