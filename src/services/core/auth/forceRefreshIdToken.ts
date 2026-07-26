import {
  ensureAnonymousUser,
  getFirebaseAuth,
} from "../firebase/firebase";

/** Force-mint a fresh ID token for the current user (anonymous if needed). */
export async function forceRefreshIdToken(): Promise<void> {
  let user = getFirebaseAuth().currentUser;
  if (!user) {
    user = await ensureAnonymousUser();
  }
  await user.getIdToken(true);
}
