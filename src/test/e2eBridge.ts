import { collection, getDocs } from "firebase/firestore";
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

declare global {
  interface Window {
    __JETLAG_E2E__?: {
      endRemoteSession: typeof endRemoteSession;
      listPendingQuestionIds: typeof listPendingQuestionIds;
      patchPendingQuestionAnswerableAt: typeof patchPendingQuestionAnswerableAt;
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
  };
}
