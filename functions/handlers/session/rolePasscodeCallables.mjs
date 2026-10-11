import { getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import {
  regenerateRolePasscodeHandler,
  revealRolePasscodeHandler,
} from "../../session/rolePasscodeReveal.mjs";
import {
  mapRevealError,
  posthogProjectApiKey,
  requireAuthSessionId,
  requireSessionRole,
} from "./shared.mjs";

export const revealRolePasscode = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
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
  { secrets: [posthogProjectApiKey], enforceAppCheck: true },
  withFunctionsExceptionHandler(async (request) => {
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
