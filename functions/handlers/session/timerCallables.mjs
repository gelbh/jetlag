import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import { controlSessionTimerForMoveHandler } from "../../session/controlSessionTimerForMove.mjs";
import { mapMoveTimerError, posthogProjectApiKey, requireAuthSessionId } from "./shared.mjs";

export const controlSessionTimerForMove = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const action = request.data?.action;
    const db = getFirestore();

    try {
      return await controlSessionTimerForMoveHandler(db, uid, sessionId, action);
    } catch (error) {
      mapMoveTimerError(error);
    }
  }),
);
