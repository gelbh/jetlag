import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { withSentryEventHandler } from "../../lib/sentry.mjs";
import {
  regenerateRolePasscodeHandler,
  revealRolePasscodeHandler,
} from "../../session/rolePasscodeReveal.mjs";
import {
  mapRevealError,
  requireAuthSessionId,
  requireSessionRole,
  sentryDsnSecret,
} from "./shared.mjs";

export const revealRolePasscode = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const role = requireSessionRole(request);
    const db = getFirestore();

    try {
      return await revealRolePasscodeHandler(db, uid, sessionId, role);
    } catch (error) {
      mapRevealError(error);
    }
  }),
);

export const regenerateRolePasscode = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    const { uid, sessionId } = requireAuthSessionId(request);
    const role = requireSessionRole(request);
    const db = getFirestore();

    try {
      return await regenerateRolePasscodeHandler(db, uid, sessionId, role);
    } catch (error) {
      mapRevealError(error);
    }
  }),
);
