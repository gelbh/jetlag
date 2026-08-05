import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { withSentryEventHandler } from "../../lib/sentry.mjs";
import { controlSessionTimerForMoveHandler } from "../../session/controlSessionTimerForMove.mjs";
import {
  mapMoveTimerError,
  requireAuthSessionId,
  sentryDsnSecret,
} from "./shared.mjs";

export const controlSessionTimerForMove = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const action = request.data?.action;
    const db = getFirestore();

    try {
      return await controlSessionTimerForMoveHandler(
        db,
        uid,
        sessionId,
        action,
      );
    } catch (error) {
      mapMoveTimerError(error);
    }
  }),
);
