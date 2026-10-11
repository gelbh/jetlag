import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { enforceAppCheck } from "../../lib/appCheck.mjs";
import { withFunctionsExceptionHandler } from "../../lib/functionsException.mjs";
import {
  cancelRoleJoinRequestHandler,
  requestRoleJoinHandler,
  resolveRoleJoinRequestHandler,
} from "../../session/joinRequest.mjs";
import { mapJoinRequestError, posthogProjectApiKey } from "./shared.mjs";

export const requestRoleJoin = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck },
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();

    try {
      return await requestRoleJoinHandler(db, request.auth, getAuth(), request.data);
    } catch (error) {
      mapJoinRequestError(error);
    }
  }),
);

export const cancelRoleJoinRequest = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck },
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();

    try {
      return await cancelRoleJoinRequestHandler(db, request.auth, request.data);
    } catch (error) {
      mapJoinRequestError(error);
    }
  }),
);

export const resolveRoleJoinRequest = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck },
  withFunctionsExceptionHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();

    try {
      return await resolveRoleJoinRequestHandler(db, request.auth, request.data);
    } catch (error) {
      mapJoinRequestError(error);
    }
  }),
);
