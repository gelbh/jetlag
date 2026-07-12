import type { User } from "firebase/auth";
import { isPermanentUser } from "../../services/core/accountAuth";

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
