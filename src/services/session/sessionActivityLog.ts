import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import type { SessionActivityEvent } from "../../domain/session/activity/sessionActivityLog";
import { useActivityLogStore } from "../../state/activityLogStore";
import { isFirebaseConfigured } from "../core/firebase";
import { createActivityLogEventIfAbsent } from "../firestore/firestoreActivityLog";

export type AppendSessionActivityResult = { wrote: boolean };

/**
 * Remote Firestore append — create-if-absent for fixed / race-safe ids.
 * Exported so unit tests can mock the remote branch.
 */
export async function appendRemoteSessionActivityEvent(
  event: SessionActivityEvent,
): Promise<AppendSessionActivityResult> {
  return createActivityLogEventIfAbsent(event.sessionId, event);
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
