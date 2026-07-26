import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { handleSessionMessageWrite } from "../session/sessionNotificationTriggers.mjs";
import { adminDb } from "../handlers/proxyShared.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const notifySessionMessage = onDocumentWritten(
  {
    document: "sessions/{sessionId}/messages/{messageId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleSessionMessageWrite(adminDb(), event);
  }),
);
