import { HttpsError } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { getSentryDsnSecret } from "../../lib/sentry.mjs";
import {
  cancelOpenPendingQuestions,
  moderateSession,
} from "../../admin/moderateSession.mjs";
import {
  INCIDENT_INVALID_DIAGNOSTICS,
  INCIDENT_PAYLOAD_TOO_LARGE,
  INCIDENT_RATE_LIMITED,
  INCIDENT_UNAUTHENTICATED,
} from "../../incident/createIncident.mjs";
import {
  INCIDENT_FORBIDDEN,
  INCIDENT_INVALID_MESSAGE,
  INCIDENT_NOT_FOUND,
} from "../../incident/postIncidentMessage.mjs";
import {
  INCIDENT_INVALID_MITIGATION,
  INCIDENT_NO_SESSION,
  INCIDENT_REPORTER_NOT_MEMBER,
} from "../../incident/applyIncidentMitigation.mjs";
import {
  INCIDENT_INVALID_STATUS,
  INCIDENT_INVALID_TRANSITION,
} from "../../incident/updateIncidentStatus.mjs";
import {
  INCIDENT_HOTFIX_VERSION_TOO_LOW,
  INCIDENT_INVALID_HOTFIX_VERSION,
} from "../../incident/publishIncidentHotfix.mjs";
import {
  HOST_CONFIRM_EXPIRED,
  HOST_CONFIRM_FORBIDDEN,
  HOST_CONFIRM_INVALID_TOOL,
  HOST_CONFIRM_NO_SESSION,
  HOST_CONFIRM_NOT_FOUND,
  HOST_CONFIRM_NOT_PENDING,
  HOST_CONFIRM_SESSION_MISMATCH,
  HOST_CONFIRM_UNAUTHENTICATED,
} from "../../incident/hostConfirm.mjs";
import {
  cancelPendingQuestionInSession,
  softDeleteAnnotationInSession,
} from "../../incident/sessionOpsExecute.mjs";
import {
  SUPPORT_AGENT_LLM_FAILED,
  SUPPORT_AGENT_NO_SESSION,
  SUPPORT_AGENT_UNAUTHENTICATED,
  SESSION_OPS_GLOBAL_TOOL_CAP,
  SESSION_OPS_SUMMON_CAP,
  SESSION_OPS_SUMMON_NOT_FOUND,
  SESSION_OPS_TOOL_CAP,
  SESSION_OPS_TURN_CAP,
} from "../../incident/supportAgentTurn.mjs";
import {
  CURSOR_HOTFIX_FAILED,
  CURSOR_HOTFIX_MISCONFIGURED,
  CURSOR_HOTFIX_SKIPPED,
} from "../../incident/launchCursorHotfix.mjs";
import { CURSOR_HOTFIX_ALREADY_LAUNCHED } from "../../incident/launchIncidentCursorAgent.mjs";

export const sentryDsnSecret = getSentryDsnSecret();
export const incidentEmailSecret = defineSecret("INCIDENT_EMAIL_SECRET");
/** OpenAI-compatible API key for session-ops support agent (never client-side). */
export const sessionOpsLlmApiKey = defineSecret("SESSION_OPS_LLM_API_KEY");
/** Cursor Cloud Agents API key for clear-bug hotfix launches (never client-side). */
export const cursorApiKey = defineSecret("CURSOR_API_KEY");
export const incidentWorkerBaseUrl = defineString("INCIDENT_WORKER_BASE_URL", {
  default: "https://jetlag.gelbhart.dev",
});
export const sessionOpsLlmBaseUrl = defineString("SESSION_OPS_LLM_BASE_URL", {
  default: "https://api.openai.com/v1",
});
export const sessionOpsLlmModel = defineString("SESSION_OPS_LLM_MODEL", {
  default: "gpt-4o-mini",
});
export const cursorHotfixRepoUrl = defineString("CURSOR_HOTFIX_REPO_URL", {
  default: "https://github.com/gelbh/jetlag",
});
export const cursorHotfixStartingRef = defineString("CURSOR_HOTFIX_STARTING_REF", {
  default: "main",
});

export function mapIncidentError(error) {
  if (error instanceof HttpsError) {
    throw error;
  }
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
    case INCIDENT_INVALID_STATUS:
      throw new HttpsError("invalid-argument", "Invalid incident status.");
    case INCIDENT_INVALID_TRANSITION:
      throw new HttpsError(
        "failed-precondition",
        "That status transition is not allowed.",
      );
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
    case CURSOR_HOTFIX_MISCONFIGURED:
      throw new HttpsError(
        "failed-precondition",
        "Cursor API is not configured.",
      );
    case CURSOR_HOTFIX_FAILED:
      throw new HttpsError("internal", "Could not launch the Cursor agent.");
    case CURSOR_HOTFIX_ALREADY_LAUNCHED:
      throw new HttpsError(
        "failed-precondition",
        "A Cursor agent is already running for this incident.",
      );
    case CURSOR_HOTFIX_SKIPPED:
      throw new HttpsError(
        "failed-precondition",
        "Could not launch the Cursor agent for this incident.",
      );
    default:
      throw error;
  }
}

/** Shared session-ops execute deps wired to Firestore + admin moderate helpers. */
export function buildSessionOpsExecuteDeps(db) {
  return {
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
  };
}
