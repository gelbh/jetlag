import type { User } from "firebase/auth";

/** Firebase Auth custom claim granting admin. Set via Admin SDK / `functions/scripts/set-admin-claim.mjs`. */
export const ADMIN_CLAIM = "admin" as const;

export function claimsLookAdmin(
  claims: Record<string, unknown> | { admin?: unknown; email_verified?: unknown },
): boolean {
  return claims.admin === true && claims.email_verified === true;
}

/**
 * Sync path cannot see custom claims without a token refresh.
 * Always false; use `resolveAdminAccess` / `claimsLookAdmin` for real gates.
 */
export function isAdminUser(_user: User | null | undefined): boolean {
  return false;
}

export type AdminAccessResolution = "unsigned" | "denied" | "admin";

export async function resolveAdminAccess(
  user: User | null | undefined,
): Promise<AdminAccessResolution> {
  if (!user || user.isAnonymous) {
    return "unsigned";
  }

  if (user.emailVerified !== true) {
    try {
      await user.reload();
    } catch {
      // fall through to forced token / deny
    }
  }

  try {
    const token = await user.getIdTokenResult(true);
    if (claimsLookAdmin(token.claims)) {
      return "admin";
    }
  } catch {}
  return "denied";
}
