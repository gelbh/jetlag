import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { handleSessionWarmPreloadWrite } from "../session/warmOverpassPreload.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const warmPremiumOverpassPreload = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleSessionWarmPreloadWrite(event);
  }),
);
