import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { isAdminAuth } from "../../admin/adminAccess.mjs";
import { approveHostConfirmHandler, denyHostConfirmHandler } from "../../incident/hostConfirm.mjs";
import {
  SESSION_OPS_AGENT_FAILED,
  supportAgentTurnHandler,
} from "../../incident/supportAgentTurn.mjs";
import { consumeRateLimit } from "../../lib/firestoreRateLimit.mjs";
import { withSentryEventHandler } from "../../lib/sentry.mjs";
import {
  buildSessionOpsExecuteDeps,
  cursorApiKey,
  mapIncidentError,
  sentryDsnSecret,
  sessionOpsMcpAuthSecret,
  sessionOpsMcpUrl,
} from "./shared.mjs";

/**
 * Read Cursor + MCP config; map missing secrets to unavailable sentinel.
 */
function readSupportAgentCursorConfig() {
  try {
    return {
      apiKey: cursorApiKey.value(),
      mcpUrl: sessionOpsMcpUrl.value(),
      mcpAuthSecret: sessionOpsMcpAuthSecret.value(),
    };
  } catch {
    throw new Error(SESSION_OPS_AGENT_FAILED);
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
 * Player/admin session-ops turn (async Cursor Cloud Agents + HTTP MCP).
 * Secrets: CURSOR_API_KEY, SESSION_OPS_MCP_AUTH_SECRET.
 */
export const postSupportAgentTurn = onCall(
  {
    secrets: [sentryDsnSecret, cursorApiKey, sessionOpsMcpAuthSecret],
    enforceAppCheck: true,
  },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();
    try {
      const cursor = readSupportAgentCursorConfig();
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
          apiKey: cursor.apiKey,
          mcpUrl: cursor.mcpUrl,
          mcpAuthSecret: cursor.mcpAuthSecret,
          rateLimit: (options) => consumeRateLimit(db, options),
        },
      );
    } catch (error) {
      mapIncidentError(error);
    }
  }),
);
