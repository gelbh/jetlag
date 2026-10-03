import { logger } from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { adminDb } from "../handlers/proxyShared.mjs";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { INTENT_MAX_AGE_MS, processSessionIntentHandler } from "../session/sessionIntents.mjs";

const sentryDsnSecret = getSentryDsnSecret();

/**
 * Offline-queued server actions (Move timer pause/resume). `retry: true` is safe
 * because the handler is idempotent via `processedAt`; stale / rejected outcomes
 * resolve normally so only transient failures retry. Events older than the
 * intent max age are dropped so a deterministic bug cannot retry for days.
 */
export const processSessionIntent = onDocumentCreated(
  {
    document: "sessions/{sessionId}/intents/{intentId}",
    retry: true,
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    const { sessionId, intentId } = event.params;
    const eventAgeMs = Date.now() - Date.parse(event.time);
    if (eventAgeMs > INTENT_MAX_AGE_MS) {
      logger.warn("processSessionIntent: dropping expired event", {
        sessionId,
        intentId,
        eventAgeMs,
      });
      return;
    }
    const result = await processSessionIntentHandler(adminDb(), sessionId, intentId);
    if (result.status === "rejected" || result.status === "stale") {
      logger.warn("processSessionIntent: intent not applied", { sessionId, intentId, ...result });
    }
  }),
);
