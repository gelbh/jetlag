import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import {
  CLAIM_USERNAME_ALREADY_SET,
  CLAIM_USERNAME_INVALID,
  CLAIM_USERNAME_TAKEN,
  claimUsernameHandler,
} from "../profile/claimUsername.mjs";

const sentryDsnSecret = getSentryDsnSecret();

export const claimUsername = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const rawUsername =
      typeof request.data?.username === "string" ? request.data.username : "";

    if (!rawUsername.trim()) {
      throw new HttpsError("invalid-argument", "Username is required.");
    }

    const db = getFirestore();

    try {
      return await claimUsernameHandler(db, request.auth.uid, rawUsername);
    } catch (error) {
      if (error instanceof Error && error.message === CLAIM_USERNAME_INVALID) {
        throw new HttpsError(
          "invalid-argument",
          error.detail ?? "Invalid username.",
        );
      }
      if (error instanceof Error && error.message === CLAIM_USERNAME_TAKEN) {
        throw new HttpsError("already-exists", "That username is taken.");
      }
      if (
        error instanceof Error &&
        error.message === CLAIM_USERNAME_ALREADY_SET
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Your username is already set.",
        );
      }
      throw error;
    }
  }),
);
