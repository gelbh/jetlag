import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { withSentryEventHandler } from "../../lib/sentry.mjs";
import { consumeRateLimit } from "../../lib/firestoreRateLimit.mjs";
import {
  isAdminAuth,
  requireAdminAuth,
  resolveAdminEmail,
} from "../../admin/adminAccess.mjs";
import {
  cancelOpenPendingQuestions,
  moderateSession,
} from "../../admin/moderateSession.mjs";
import { createIncidentHandler } from "../../incident/createIncident.mjs";
import { sendIncidentEmail } from "../../incident/sendIncidentEmail.mjs";
import { postIncidentMessageHandler } from "../../incident/postIncidentMessage.mjs";
import { applyIncidentMitigationHandler } from "../../incident/applyIncidentMitigation.mjs";
import { updateIncidentStatusHandler } from "../../incident/updateIncidentStatus.mjs";
import { publishIncidentHotfixHandler } from "../../incident/publishIncidentHotfix.mjs";
import { launchCursorHotfixForIncident } from "../../incident/launchCursorHotfix.mjs";
import { launchIncidentCursorAgentHandler } from "../../incident/launchIncidentCursorAgent.mjs";
import {
  cursorApiKey,
  cursorHotfixRepoUrl,
  cursorHotfixStartingRef,
  incidentEmailSecret,
  incidentWorkerBaseUrl,
  mapIncidentError,
  sentryDsnSecret,
} from "./shared.mjs";

export const createIncident = onCall(
  {
    secrets: [sentryDsnSecret, incidentEmailSecret, cursorApiKey],
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
          launchCursorHotfix: (payload) =>
            launchCursorHotfixForIncident(db, payload, {
              apiKey: cursorApiKey.value(),
              repositoryUrl: cursorHotfixRepoUrl.value(),
              startingRef: cursorHotfixStartingRef.value(),
            }),
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
      return await postIncidentMessageHandler(
        db,
        {
          incidentId: request.data?.incidentId,
          uid: request.auth.uid,
          isAdmin: isAdminAuth(request.auth),
          text: request.data?.text,
        },
        {
          rateLimit: (options) => consumeRateLimit(db, options),
        },
      );
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

export const updateIncidentStatus = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    requireAdminAuth(request.auth);

    const db = getFirestore();
    try {
      return await updateIncidentStatusHandler(db, {
        incidentId: request.data?.incidentId,
        status: request.data?.status,
        uid: request.auth.uid,
      });
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

/** Admin force-launch of Cursor coding agent (private hotfix thread). */
export const launchIncidentCursorAgent = onCall(
  {
    secrets: [sentryDsnSecret, cursorApiKey],
    enforceAppCheck: true,
  },
  withSentryEventHandler(async (request) => {
    requireAdminAuth(request.auth);

    const db = getFirestore();
    try {
      return await launchIncidentCursorAgentHandler(
        db,
        {
          incidentId: request.data?.incidentId,
          uid: request.auth.uid,
        },
        {
          launchDeps: {
            apiKey: cursorApiKey.value(),
            repositoryUrl: cursorHotfixRepoUrl.value(),
            startingRef: cursorHotfixStartingRef.value(),
          },
        },
      );
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);
