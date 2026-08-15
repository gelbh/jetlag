import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { withSentryEventHandler } from "../../lib/sentry.mjs";
import { consumeRateLimit } from "../../lib/firestoreRateLimit.mjs";
import { isAdminAuth } from "../../admin/adminAccess.mjs";
import {
  approveHostConfirmHandler,
  denyHostConfirmHandler,
} from "../../incident/hostConfirm.mjs";
import { supportAgentTurnHandler, SUPPORT_AGENT_LLM_FAILED } from "../../incident/supportAgentTurn.mjs";
import { sendSessionNotification } from "../../session/sessionNotificationTriggers.mjs";
import {
  buildSessionOpsExecuteDeps,
  mapIncidentError,
  sentryDsnSecret,
  sessionOpsLlmApiKey,
  sessionOpsLlmBaseUrl,
  sessionOpsLlmModel,
} from "./shared.mjs";

/**
 * Read LLM secrets/params; map missing/misconfigured secrets to the expected
 * support-agent unavailable sentinel (avoids raw uncaught 500s).
 */
function readSupportAgentLlmConfig() {
  try {
    return {
      apiKey: sessionOpsLlmApiKey.value(),
      llmBaseUrl: sessionOpsLlmBaseUrl.value(),
      llmModel: sessionOpsLlmModel.value(),
    };
  } catch {
    throw new Error(SUPPORT_AGENT_LLM_FAILED);
  }
}

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
          runTransaction: (fn) => db.runTransaction(fn),
          executeDeps: buildSessionOpsExecuteDeps(db),
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
      const llm = readSupportAgentLlmConfig();
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
          apiKey: llm.apiKey,
          llmBaseUrl: llm.llmBaseUrl,
          llmModel: llm.llmModel,
          rateLimit: (options) => consumeRateLimit(db, options),
          notifyHostConfirm: (payload) => sendSessionNotification(db, payload),
          executeDeps: buildSessionOpsExecuteDeps(db),
        },
      );
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);
