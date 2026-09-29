import { FirebaseError } from "firebase/app";

/** Codes where the cached user can never mint a valid token again. */
const DEFINITIVE_AUTH_CODES = new Set([
  "auth/user-token-expired",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/invalid-user-token",
]);

/**
 * Only these justify signOut + fresh anonymous sign-in. Network / quota /
 * internal errors keep the persisted user so an offline map mount does not
 * burn the anonymous uid (the old uid is unrecoverable once signed out).
 */
export function isDefinitiveAuthFailure(error: unknown): boolean {
  return error instanceof FirebaseError && DEFINITIVE_AUTH_CODES.has(error.code);
}
