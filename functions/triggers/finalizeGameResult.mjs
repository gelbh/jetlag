import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { adminDb } from "../handlers/proxyShared.mjs";
import { posthogProjectApiKey, withFunctionsExceptionHandler } from "../lib/functionsException.mjs";
import { handleFinalizeGameResultWrite } from "../session/finalizeGameResult.mjs";

export const finalizeGameResult = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [posthogProjectApiKey],
  },
  withFunctionsExceptionHandler(async (event) => {
    await handleFinalizeGameResultWrite(adminDb(), event);
  }),
);
