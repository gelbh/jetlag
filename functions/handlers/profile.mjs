import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import {
  CLAIM_USERNAME_ALREADY_SET,
  CLAIM_USERNAME_INVALID,
  CLAIM_USERNAME_TAKEN,
  claimUsernameHandler,
} from "../profile/claimUsername.mjs";
import {
  FRIENDS_ALREADY,
  FRIENDS_INVALID,
  FRIENDS_LIMIT,
  FRIENDS_NOT_FOUND,
  FRIENDS_NO_REQUEST,
  FRIENDS_RATE_LIMITED,
  FRIENDS_SELF,
  profileFriendsHandler,
} from "../profile/profileFriends.mjs";

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

export const profileFriends = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    try {
      return await profileFriendsHandler(
        getFirestore(),
        request.auth,
        request.data ?? {},
      );
    } catch (error) {
      const code = error instanceof Error ? error.code : undefined;
      const message =
        error instanceof Error ? error.message : "Friends action failed.";
      if (code === "unauthenticated") {
        throw new HttpsError("unauthenticated", message);
      }
      if (
        code === FRIENDS_INVALID ||
        code === FRIENDS_SELF ||
        code === FRIENDS_NO_REQUEST
      ) {
        throw new HttpsError("invalid-argument", message);
      }
      if (code === FRIENDS_NOT_FOUND) {
        throw new HttpsError("not-found", message);
      }
      if (code === FRIENDS_ALREADY) {
        throw new HttpsError("already-exists", message);
      }
      if (code === FRIENDS_RATE_LIMITED || code === FRIENDS_LIMIT) {
        throw new HttpsError(
          code === FRIENDS_RATE_LIMITED
            ? "resource-exhausted"
            : "failed-precondition",
          message,
        );
      }
      if (code === "failed-precondition") {
        throw new HttpsError("failed-precondition", message);
      }
      throw error;
    }
  }),
);
