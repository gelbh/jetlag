import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { adminDb } from "../handlers/proxyShared.mjs";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { processSessionIntentHandler } from "../session/sessionIntents.mjs";

const sentryDsnSecret = getSentryDsnSecret();

/**
 * Offline-queued server actions (Move timer pause/resume). `retry: true` is safe
 * because the handler is idempotent via `processedAt`; non-retryable outcomes
 * (stale / rejected) resolve normally so they are not retried.
 */
export const processSessionIntent = onDocumentCreated(
  {
    document: "sessions/{sessionId}/intents/{intentId}",
    retry: true,
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await processSessionIntentHandler(adminDb(), event.params.sessionId, event.params.intentId);
  }),
);
