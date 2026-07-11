import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "../services/core/firebase";
import { endRemoteSession } from "../services/firestore/firestoreAnnotations";
import { updatePendingQuestion } from "../services/firestore/firestoreSessionExtras";

async function listPendingQuestionIds(sessionId: string): Promise<string[]> {
  const snapshot = await getDocs(
    collection(getFirestoreDb(), "sessions", sessionId, "pendingQuestions"),
  );
  return snapshot.docs.map((document) => document.id);
}

async function patchPendingQuestionAnswerableAt(
  sessionId: string,
  questionId: string,
  answerableAt: string,
): Promise<void> {
  await updatePendingQuestion(sessionId, questionId, { answerableAt });
}

async function patchSessionTimer(
  sessionId: string,
  elapsedMs: number,
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), "sessions", sessionId), {
    timerAccumulatedMs: elapsedMs,
    timerRunningSince: null,
  });
}

const TUTORIAL_PREMIUM_CAPTURE_EMAIL = "tutorial-premium@jetlag.test";
const TUTORIAL_PREMIUM_CAPTURE_PASSWORD = "tutorial-premium-pass";

async function waitForPermanentAuthUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Timed out waiting for permanent auth user."));
    }, 10_000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        window.clearTimeout(timeoutId);
        unsubscribe();
        resolve();
      }
    });
  });
}

async function signInPermanentUserForCapture(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    return;
  }

  if (auth.currentUser) {
    await signOut(auth);
  }

  try {
    await createUserWithEmailAndPassword(
      auth,
      TUTORIAL_PREMIUM_CAPTURE_EMAIL,
      TUTORIAL_PREMIUM_CAPTURE_PASSWORD,
    );
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : null;
    if (code === "auth/email-already-in-use") {
      await signInWithEmailAndPassword(
        auth,
        TUTORIAL_PREMIUM_CAPTURE_EMAIL,
        TUTORIAL_PREMIUM_CAPTURE_PASSWORD,
      );
    } else {
      throw error;
    }
  }

  await waitForPermanentAuthUser();
}

declare global {
  interface Window {
    __JETLAG_E2E__?: {
      endRemoteSession: typeof endRemoteSession;
      listPendingQuestionIds: typeof listPendingQuestionIds;
      patchPendingQuestionAnswerableAt: typeof patchPendingQuestionAnswerableAt;
      patchSessionTimer: typeof patchSessionTimer;
      signInPermanentUserForCapture: typeof signInPermanentUserForCapture;
    };
  }
}

export function installE2EBridgeIfConfigured(): void {
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR !== "true") {
    return;
  }

  window.__JETLAG_E2E__ = {
    endRemoteSession,
    listPendingQuestionIds,
    patchPendingQuestionAnswerableAt,
    patchSessionTimer,
    signInPermanentUserForCapture,
  };
}
