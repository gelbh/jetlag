import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import type { SessionActivityEvent } from "../../domain/session/sessionActivityLog";
import { useActivityLogStore } from "../../state/activityLogStore";
import { isFirebaseConfigured } from "../core/firebase";

export type AppendSessionActivityResult = { wrote: boolean };

/**
 * Remote Firestore append — Task 3 replaces this stub.
 * Exported so unit tests can mock the remote branch.
 */
export async function appendRemoteSessionActivityEvent(
  _event: SessionActivityEvent,
): Promise<AppendSessionActivityResult> {
  throw new Error("not implemented");
}

export async function appendSessionActivityEvent(
  event: SessionActivityEvent,
): Promise<AppendSessionActivityResult> {
  if (event.sessionId === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
    const wrote = useActivityLogStore.getState().appendIfAbsent(event);
    return { wrote };
  }

  return appendRemoteSessionActivityEvent(event);
}
