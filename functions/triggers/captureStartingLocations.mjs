import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { adminDb } from "../handlers/proxyShared.mjs";
import { posthogProjectApiKey, withFunctionsExceptionHandler } from "../lib/functionsException.mjs";
import { handleCaptureStartingLocationsWrite } from "../session/captureStartingLocations.mjs";

export const captureStartingLocations = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [posthogProjectApiKey],
  },
  withFunctionsExceptionHandler(async (event) => {
    await handleCaptureStartingLocationsWrite(adminDb(), event);
  }),
);
