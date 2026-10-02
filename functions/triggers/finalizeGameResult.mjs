import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { adminDb } from "../handlers/proxyShared.mjs";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { handleFinalizeGameResultWrite } from "../session/finalizeGameResult.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const finalizeGameResult = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleFinalizeGameResultWrite(adminDb(), event);
  }),
);
