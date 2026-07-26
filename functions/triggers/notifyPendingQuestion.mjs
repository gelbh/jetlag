import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { handlePendingQuestionWrite } from "../session/sessionNotificationTriggers.mjs";
import { adminDb } from "../handlers/proxyShared.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const notifyPendingQuestion = onDocumentWritten(
  {
    document: "sessions/{sessionId}/pendingQuestions/{questionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handlePendingQuestionWrite(adminDb(), event);
  }),
);
