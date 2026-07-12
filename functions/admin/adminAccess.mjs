import { defineString } from "firebase-functions/params";
import { HttpsError } from "firebase-functions/v2/https";

export const ADMIN_EMAIL_DEFAULT = "gelbharttomer@gmail.com";

export const adminEmailParam = defineString("ADMIN_EMAIL", {
  default: ADMIN_EMAIL_DEFAULT,
});

export function resolveAdminEmail() {
  try {
    const configured = adminEmailParam.value();
    return configured?.trim() ? configured.trim().toLowerCase() : ADMIN_EMAIL_DEFAULT;
  } catch {
    return ADMIN_EMAIL_DEFAULT;
  }
}

export function normalizeAdminEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isAdminAuth(auth) {
  if (!auth?.token) {
    return false;
  }

  const email = auth.token.email;
  const verified = auth.token.email_verified === true;
  if (!verified || typeof email !== "string") {
    return false;
  }

  return normalizeAdminEmail(email) === resolveAdminEmail();
}

export function requireAdminAuth(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  if (!isAdminAuth(auth)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}
