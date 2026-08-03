import { httpsCallable } from "firebase/functions";
import {
  getFirebaseFunctions,
  isFirebaseConfigured,
} from "../core/firebase/firebase";

export type MoveTimerAction = "pause" | "resume";

export type ControlSessionTimerForMoveResult = {
  ok: true;
  action: MoveTimerAction;
  noop: boolean;
};

export async function controlSessionTimerForMove(
  sessionId: string,
  action: MoveTimerAction,
): Promise<ControlSessionTimerForMoveResult> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    { sessionId: string; action: MoveTimerAction },
    ControlSessionTimerForMoveResult
  >(functions, "controlSessionTimerForMove");
  const result = await callable({ sessionId, action });
  return result.data;
}
