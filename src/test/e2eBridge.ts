import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { getFirestoreDb } from "../services/core/firebase";
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

declare global {
  interface Window {
    __JETLAG_E2E__?: {
      endRemoteSession: typeof endRemoteSession;
      listPendingQuestionIds: typeof listPendingQuestionIds;
      patchPendingQuestionAnswerableAt: typeof patchPendingQuestionAnswerableAt;
      patchSessionTimer: typeof patchSessionTimer;
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
  };
}
