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
  INCIDENT_REPORTER_NOT_MEMBER,
} from "../incident/applyIncidentMitigation.mjs";
import {
  INCIDENT_HOTFIX_VERSION_TOO_LOW,
  INCIDENT_INVALID_HOTFIX_VERSION,
  publishIncidentHotfixHandler,
} from "../incident/publishIncidentHotfix.mjs";
import {
  approveHostConfirmHandler,
  denyHostConfirmHandler,
  HOST_CONFIRM_EXPIRED,
  HOST_CONFIRM_FORBIDDEN,
  HOST_CONFIRM_INVALID_TOOL,
  HOST_CONFIRM_NO_SESSION,
  HOST_CONFIRM_NOT_FOUND,
  HOST_CONFIRM_NOT_PENDING,
  HOST_CONFIRM_SESSION_MISMATCH,
  HOST_CONFIRM_UNAUTHENTICATED,
} from "../incident/hostConfirm.mjs";
import {
  cancelPendingQuestionInSession,
  softDeleteAnnotationInSession,
} from "../incident/sessionOpsExecute.mjs";
import {
  SUPPORT_AGENT_LLM_FAILED,
  SUPPORT_AGENT_NO_SESSION,
  SUPPORT_AGENT_UNAUTHENTICATED,
  SESSION_OPS_GLOBAL_TOOL_CAP,
  SESSION_OPS_SUMMON_CAP,
  SESSION_OPS_SUMMON_NOT_FOUND,
  SESSION_OPS_TOOL_CAP,
  SESSION_OPS_TURN_CAP,
  supportAgentTurnHandler,
} from "../incident/supportAgentTurn.mjs";

const sentryDsnSecret = getSentryDsnSecret();
const incidentEmailSecret = defineSecret("INCIDENT_EMAIL_SECRET");
/** OpenAI-compatible API key for session-ops support agent (never client-side). */
const sessionOpsLlmApiKey = defineSecret("SESSION_OPS_LLM_API_KEY");
const incidentWorkerBaseUrl = defineString("INCIDENT_WORKER_BASE_URL", {
  default: "https://jetlag.gelbhart.dev",
});
const sessionOpsLlmBaseUrl = defineString("SESSION_OPS_LLM_BASE_URL", {
  default: "https://api.openai.com/v1",
});
const sessionOpsLlmModel = defineString("SESSION_OPS_LLM_MODEL", {
  default: "gpt-4o-mini",
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
    case INCIDENT_REPORTER_NOT_MEMBER:
      throw new HttpsError(
        "failed-precondition",
        "Incident reporter is not a member of the linked session.",
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
    case HOST_CONFIRM_UNAUTHENTICATED:
      throw new HttpsError("unauthenticated", "Sign in required.");
    case HOST_CONFIRM_NOT_FOUND:
      throw new HttpsError("not-found", "Host confirmation not found.");
    case HOST_CONFIRM_FORBIDDEN:
      throw new HttpsError(
        "permission-denied",
        "Only the session host can approve this action.",
      );
    case HOST_CONFIRM_EXPIRED:
      throw new HttpsError(
        "failed-precondition",
        "This confirmation expired. Ask the fix agent to try again.",
      );
    case HOST_CONFIRM_NOT_PENDING:
      throw new HttpsError(
        "failed-precondition",
        "This confirmation was already used or denied.",
      );
    case HOST_CONFIRM_NO_SESSION:
      throw new HttpsError(
        "failed-precondition",
        "Incident has no linked session host.",
      );
    case HOST_CONFIRM_INVALID_TOOL:
      throw new HttpsError("invalid-argument", "Invalid tool for confirmation.");
    case HOST_CONFIRM_SESSION_MISMATCH:
      throw new HttpsError(
        "invalid-argument",
        "Confirmation session does not match the incident.",
      );
    case SUPPORT_AGENT_UNAUTHENTICATED:
      throw new HttpsError("unauthenticated", "Sign in required.");
    case SUPPORT_AGENT_NO_SESSION:
      throw new HttpsError(
        "failed-precondition",
        "Incident has no linked session.",
      );
    case SUPPORT_AGENT_LLM_FAILED:
      throw new HttpsError(
        "internal",
        "Support agent is temporarily unavailable.",
      );
    case SESSION_OPS_SUMMON_CAP:
    case SESSION_OPS_TURN_CAP:
    case SESSION_OPS_TOOL_CAP:
    case SESSION_OPS_GLOBAL_TOOL_CAP:
      throw new HttpsError(
        "resource-exhausted",
        "Session-ops agent limit reached for this session.",
      );
    case SESSION_OPS_SUMMON_NOT_FOUND:
      throw new HttpsError(
        "failed-precondition",
        "Session-ops summon not found. Ask the fix agent again.",
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

/** Host approves a pending destructive session-ops confirm and executes once. */
export const approveHostConfirm = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();
    try {
      return await approveHostConfirmHandler(
        db,
        {
          incidentId: request.data?.incidentId,
          confirmId: request.data?.confirmId,
          uid: request.auth.uid,
        },
        {
          executeDeps: {
            moderate: (sessionId, action, adminUid) =>
              moderateSession(db, sessionId, action, adminUid),
            clearPendingQuestions: (sessionId) =>
              cancelOpenPendingQuestions(db, sessionId),
            cancelPendingQuestion: (sessionId, questionId) =>
              cancelPendingQuestionInSession(db, sessionId, questionId),
            softDeleteAnnotation: (sessionId, annotationId) =>
              softDeleteAnnotationInSession(
                db,
                sessionId,
                annotationId,
                new Date().toISOString(),
              ),
          },
        },
      );
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);

/** Host denies a pending confirm without executing. */
export const denyHostConfirm = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();
    try {
      return await denyHostConfirmHandler(db, {
        incidentId: request.data?.incidentId,
        confirmId: request.data?.confirmId,
        uid: request.auth.uid,
      });
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);

/**
 * Player/admin session-ops LLM turn (dual-channel). Secret:
 * SESSION_OPS_LLM_API_KEY (OpenAI-compatible Chat Completions).
 */
export const postSupportAgentTurn = onCall(
  {
    secrets: [sentryDsnSecret, sessionOpsLlmApiKey],
    enforceAppCheck: true,
  },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();
    try {
      return await supportAgentTurnHandler(
        db,
        {
          incidentId: request.data?.incidentId,
          uid: request.auth.uid,
          isAdmin: isAdminAuth(request.auth),
          text: request.data?.text,
          summonId: request.data?.summonId ?? null,
        },
        {
          apiKey: sessionOpsLlmApiKey.value(),
          llmBaseUrl: sessionOpsLlmBaseUrl.value(),
          llmModel: sessionOpsLlmModel.value(),
          rateLimit: (options) => consumeRateLimit(db, options),
          executeDeps: {
            moderate: (sessionId, action, adminUid) =>
              moderateSession(db, sessionId, action, adminUid),
            clearPendingQuestions: (sessionId) =>
              cancelOpenPendingQuestions(db, sessionId),
            cancelPendingQuestion: (sessionId, questionId) =>
              cancelPendingQuestionInSession(db, sessionId, questionId),
            softDeleteAnnotation: (sessionId, annotationId) =>
              softDeleteAnnotationInSession(
                db,
                sessionId,
                annotationId,
                new Date().toISOString(),
              ),
          },
        },
      );
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);
