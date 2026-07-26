import type { User } from "firebase/auth";
import { isPermanentUser } from "@/services/core/accountAuth";

export const ADMIN_EMAIL = "gelbharttomer@gmail.com";

/** Must stay in sync with `firestore.rules` isAdmin() and Functions ADMIN_EMAIL param. */

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return normalizeAdminEmail(email) === normalizeAdminEmail(ADMIN_EMAIL);
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user || !isPermanentUser(user)) {
    return false;
  }

  return user.emailVerified === true && isAdminEmail(user.email);
}

export type AdminAccessResolution = "unsigned" | "denied" | "admin";

export function claimsLookAdmin(
  claims: Record<string, unknown> | { email?: unknown; email_verified?: unknown },
): boolean {
  return (
    claims.email_verified === true &&
    typeof claims.email === "string" &&
    isAdminEmail(claims.email)
  );
}

export async function resolveAdminAccess(
  user: User | null | undefined,
): Promise<AdminAccessResolution> {
  if (!user || !isPermanentUser(user)) {
    return "unsigned";
  }
  if (!isAdminEmail(user.email)) {
    return "denied";
  }
  if (isAdminUser(user)) {
    return "admin";
  }
  try {
    await user.reload();
  } catch {
    // fall through to token / deny
  }
  if (isAdminUser(user)) {
    return "admin";
  }
  try {
    const token = await user.getIdTokenResult(true);
    if (claimsLookAdmin(token.claims)) {
      return "admin";
    }
  } catch {
    // deny
  }
  return "denied";
}
