import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteField,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  AnnotationRecord,
  GameArea,
  SessionRecord,
  SessionTier,
} from "../domain/annotations";
import { timerStateToRemote, type TimerState } from "../domain/timer";
import { getFirestoreDb } from "./firebase";
import {
  buildAnnotationDocument,
  buildSessionDocument,
  deserializeAnnotationFromFirestore,
  deserializeSessionFromFirestore,
} from "./firestoreSerialization";
import { generateSessionCode } from "./sessionCodes";

function sessionsCollection() {
  return collection(getFirestoreDb(), "sessions");
}

function annotationsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "annotations");
}

export function isFirestorePermissionDenied(error: unknown): boolean {
  return error instanceof FirebaseError && error.code === "permission-denied";
}

export async function ensureRemoteSessionWriteAccess(
  session: SessionRecord,
  uid: string,
): Promise<SessionRecord> {
  if (session.memberUids.includes(uid)) {
    return session;
  }

  const result = await joinRemoteSessionByCode(session.code, uid);

  if (result.status === "joined") {
    return result.session;
  }

  if (result.status === "ended") {
    throw new Error("That session has ended. Join or create a new one.");
  }

  throw new Error("Unable to access that session.");
}

export async function createRemoteSession(
  gameArea: GameArea,
  hostUid: string,
  tier: SessionTier = "free",
  transitMetroId?: string,
): Promise<SessionRecord> {
  let code = generateSessionCode();
  let attempts = 0;

  while (attempts < 8) {
    const existing = await getDocs(
      query(sessionsCollection(), where("code", "==", code)),
    );
    if (existing.empty) {
      break;
    }

    code = generateSessionCode();
    attempts += 1;
  }

  const sessionRef = doc(sessionsCollection());
  const createdAt = new Date().toISOString();
  const session: SessionRecord = {
    id: sessionRef.id,
    code,
    gameArea,
    hostUid,
    createdAt,
    memberUids: [hostUid],
    tier,
    transitMetroId,
  };

  await setDoc(sessionRef, {
    ...buildSessionDocument(
      code,
      gameArea,
      hostUid,
      createdAt,
      tier,
      transitMetroId,
    ),
    createdAtServer: serverTimestamp(),
  });

  return session;
}

export async function lookupRemoteSessionByCode(
  code: string,
): Promise<
  | { status: "missing" }
  | { status: "ended" }
  | { status: "found"; session: SessionRecord }
> {
  const snapshot = await getDocs(
    query(sessionsCollection(), where("code", "==", code)),
  );

  if (snapshot.empty) {
    return { status: "missing" };
  }

  const sessionDoc = snapshot.docs[0];
  const data = sessionDoc.data() as Record<string, unknown>;

  if (typeof data.endedAt === "string") {
    return { status: "ended" };
  }

  return {
    status: "found",
    session: deserializeSessionFromFirestore(sessionDoc.id, data),
  };
}

export async function joinRemoteSessionByCode(
  code: string,
  uid: string,
): Promise<
  | { status: "missing" }
  | { status: "ended" }
  | { status: "joined"; session: SessionRecord }
> {
  const snapshot = await getDocs(
    query(sessionsCollection(), where("code", "==", code)),
  );

  if (snapshot.empty) {
    return { status: "missing" };
  }

  const sessionDoc = snapshot.docs[0];
  const data = sessionDoc.data() as Omit<SessionRecord, "id">;
  if (data.endedAt) {
    return { status: "ended" };
  }

  const memberUids = Array.from(new Set([...(data.memberUids ?? []), uid]));

  if (!data.memberUids?.includes(uid)) {
    await updateDoc(sessionDoc.ref, { memberUids });
  }

  return {
    status: "joined",
    session: deserializeSessionFromFirestore(sessionDoc.id, {
      ...data,
      memberUids,
    }),
  };
}

export async function getRemoteSessionById(
  sessionId: string,
): Promise<SessionRecord | null> {
  const sessionRef = doc(sessionsCollection(), sessionId);
  const snapshot = await getDoc(sessionRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Record<string, unknown>;

  return deserializeSessionFromFirestore(snapshot.id, data);
}

export async function endRemoteSession(sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endedAt: new Date().toISOString(),
    status: "ended",
    code: deleteField(),
  });
}

export async function updateSessionTimer(
  sessionId: string,
  state: TimerState,
): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), timerStateToRemote(state));
}

export function subscribeToSession(
  sessionId: string,
  onChange: (session: SessionRecord) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(sessionsCollection(), sessionId),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      onChange(
        deserializeSessionFromFirestore(
          snapshot.id,
          snapshot.data() as Record<string, unknown>,
        ),
      );
    },
    (error) => onError(error),
  );
}

export async function writeRemoteAnnotation(
  sessionId: string,
  annotation: AnnotationRecord,
): Promise<void> {
  const annotationRef = doc(annotationsCollection(sessionId), annotation.id);
  await setDoc(annotationRef, {
    ...buildAnnotationDocument(annotation),
    updatedAt: serverTimestamp(),
  });
}

const FIRESTORE_BATCH_LIMIT = 500;

export async function writeRemoteAnnotationsBatch(
  sessionId: string,
  annotations: AnnotationRecord[],
): Promise<void> {
  if (annotations.length === 0) {
    return;
  }

  for (let index = 0; index < annotations.length; index += FIRESTORE_BATCH_LIMIT) {
    const chunk = annotations.slice(index, index + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(getFirestoreDb());

    for (const annotation of chunk) {
      const annotationRef = doc(annotationsCollection(sessionId), annotation.id);
      batch.set(annotationRef, {
        ...buildAnnotationDocument(annotation),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }
}

export function subscribeToRemoteAnnotations(
  sessionId: string,
  onChange: (annotations: AnnotationRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    annotationsCollection(sessionId),
    (snapshot) => {
      const annotations = snapshot.docs.map((annotationDoc) =>
        deserializeAnnotationFromFirestore(
          sessionId,
          annotationDoc.id,
          annotationDoc.data() as Record<string, unknown>,
        ),
      );

      onChange(annotations);
    },
    (error) => onError(error),
  );
}
