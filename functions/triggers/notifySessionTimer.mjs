import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { handleSessionTimerWrite } from "../session/sessionNotificationTriggers.mjs";
import { adminDb } from "../handlers/proxyShared.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const notifySessionTimer = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleSessionTimerWrite(adminDb(), event);
  }),
);
