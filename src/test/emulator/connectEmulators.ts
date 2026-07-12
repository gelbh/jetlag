import {
  getFirebaseAuth,
  getFirestoreDb,
  resetFirebaseForTests,
} from "../../services/core/firebase";
import { signInAnonymously, signOut } from "firebase/auth";

export async function connectEmulatorsForTests(): Promise<{
  uid: string;
}> {
  await teardownEmulatorsForTests();
  getFirestoreDb();
  const firebaseAuth = getFirebaseAuth();
  const credential = await signInAnonymously(firebaseAuth);
  return { uid: credential.user.uid };
}

export async function teardownEmulatorsForTests(): Promise<void> {
  try {
    const firebaseAuth = getFirebaseAuth();
    if (firebaseAuth.currentUser) {
      await signOut(firebaseAuth);
    }
  } catch {
    // Firebase app may already be torn down.
  }

  await resetFirebaseForTests();
}
