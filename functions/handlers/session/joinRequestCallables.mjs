import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { withSentryEventHandler } from "../../lib/sentry.mjs";
import {
  cancelRoleJoinRequestHandler,
  requestRoleJoinHandler,
  resolveRoleJoinRequestHandler,
} from "../../session/joinRequest.mjs";
import {
  mapJoinRequestError,
  sentryDsnSecret,
} from "./shared.mjs";

export const requestRoleJoin = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const db = getFirestore();

    try {
      return await requestRoleJoinHandler(
        db,
        request.auth,
        getAuth(),
        request.data,
      );
    } catch (error) {
      mapJoinRequestError(error);
    }
  }),
);

export const cancelRoleJoinRequest = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
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
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
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
