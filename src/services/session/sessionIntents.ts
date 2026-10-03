import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { buildMoveTimerIntent, type MoveTimerAction } from "@/domain/session/intents/intents";
import { getFirestoreDb } from "@/services/core/firebase/firebase";
import { serverNow } from "@/services/core/time/serverClock";
import { commitWrite } from "@/services/firestore/commitWrite";

/**
 * Offline-queued replacement for the `controlSessionTimerForMove` callable
 * (the callable stays deployed for older clients). The intent lands in Firestore's
 * persisted write queue immediately; the `processSessionIntent` trigger applies
 * it once it reaches the server. Never await `acknowledged` in UI flows.
 */
export function enqueueMoveTimerIntent(
  sessionId: string,
  uid: string,
  action: MoveTimerAction,
): { intentId: string; acknowledged: Promise<void> } {
  const ref = doc(collection(getFirestoreDb(), "sessions", sessionId, "intents"));
  const intent = buildMoveTimerIntent(uid, action, serverNow());
  const { acknowledged } = commitWrite("move.intent", () =>
    setDoc(ref, { ...intent, createdAt: serverTimestamp() }),
  );
  return { intentId: ref.id, acknowledged };
}
