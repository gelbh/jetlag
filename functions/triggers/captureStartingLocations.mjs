import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { handleCaptureStartingLocationsWrite } from "../session/captureStartingLocations.mjs";
import { adminDb } from "../handlers/proxyShared.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const captureStartingLocations = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleCaptureStartingLocationsWrite(adminDb(), event);
  }),
);
