import { defineString } from "firebase-functions/params";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * Notification recipient for incident/preload mail (not auth).
 * Set via Functions param / Doppler; never commit personal addresses.
 */
export const adminEmailParam = defineString("ADMIN_EMAIL", {
  default: "",
});

export function resolveAdminEmail() {
  try {
    const configured = adminEmailParam.value();
    return typeof configured === "string" ? configured.trim() : "";
  } catch {
    return "";
  }
}

/** Auth: Firebase custom claim `admin === true` (plus verified email). */
export function isAdminAuth(auth) {
  if (!auth?.token) {
    return false;
  }

  return auth.token.admin === true && auth.token.email_verified === true;
}

export function requireAdminAuth(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  if (!isAdminAuth(auth)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}
