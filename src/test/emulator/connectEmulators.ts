import {
  ensureAnonymousUser,
  getFirestoreDb,
  resetFirebaseForTests,
} from "../../services/core/firebase";

export async function connectEmulatorsForTests(): Promise<{
  uid: string;
}> {
  await resetFirebaseForTests();
  getFirestoreDb();
  const user = await ensureAnonymousUser();
  return { uid: user.uid };
}

export async function teardownEmulatorsForTests(): Promise<void> {
  await resetFirebaseForTests();
}
