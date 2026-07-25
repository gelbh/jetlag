import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { SessionActivityEvent } from "../../domain/session/sessionActivityLog";
import { sortActivityEventsDesc } from "../../domain/session/sessionActivityLog";
import { getFirestoreDb } from "../core/firebase";
import { isFirestorePermissionDenied } from "./firestoreAnnotations";
import {
  buildActivityLogDocument,
  deserializeActivityLogFromFirestore,
} from "./firestoreActivityLogSerialization";

function activityLogCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "activityLog");
}

function isFirestoreAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) {
    return false;
  }
  return (
    error.code === "already-exists" ||
    error.code === "firestore/already-exists" ||
    /document already exists/i.test(error.message)
  );
}

export async function createActivityLogEventIfAbsent(
  sessionId: string,
  event: SessionActivityEvent,
): Promise<{ wrote: boolean }> {
  const eventRef = doc(activityLogCollection(sessionId), event.id);
  try {
    await setDoc(eventRef, buildActivityLogDocument(event));
    return { wrote: true };
  } catch (error) {
    if (isFirestoreAlreadyExistsError(error)) {
      return { wrote: false };
    }
    // Append-only rules treat a second write as update → permission-denied.
    if (isFirestorePermissionDenied(error)) {
      const existing = await getDoc(eventRef);
      if (existing.exists()) {
        return { wrote: false };
      }
    }
    throw error;
  }
}

export function subscribeActivityLog(
  sessionId: string,
  onChange: (events: SessionActivityEvent[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(activityLogCollection(sessionId), orderBy("createdAt", "desc")),
    (snapshot) => {
      const events = snapshot.docs.map((eventDoc) =>
        deserializeActivityLogFromFirestore(
          eventDoc.id,
          sessionId,
          eventDoc.data() as Record<string, unknown>,
        ),
      );
      onChange(sortActivityEventsDesc(events));
    },
    (error) => onError(error),
  );
}
