import { FirebaseError } from "firebase/app";
import {
  addDoc,
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
  type Unsubscribe,
} from "firebase/firestore";
import type {
  AnnotationRecord,
  GameArea,
  SessionRecord,
} from "../domain/annotations";
import { getFirestoreDb } from "./firebase";
import {
  buildAnnotationDocument,
  buildSessionDocument,
  deserializeAnnotationFromFirestore,
  deserializeGameAreaFromFirestore,
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
    transitMetroId,
  };

  await setDoc(sessionRef, {
    ...buildSessionDocument(code, gameArea, hostUid, createdAt, transitMetroId),
    createdAtServer: serverTimestamp(),
  });

  return session;
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
    session: {
      id: sessionDoc.id,
      code: data.code,
      gameArea: deserializeGameAreaFromFirestore(data.gameArea),
      hostUid: data.hostUid,
      createdAt: data.createdAt,
      memberUids,
      transitMetroId: data.transitMetroId,
      endedAt: data.endedAt,
    },
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

  const data = snapshot.data() as Omit<SessionRecord, "id">;

  return {
    id: snapshot.id,
    code: data.code,
    gameArea: deserializeGameAreaFromFirestore(data.gameArea),
    hostUid: data.hostUid,
    createdAt: data.createdAt,
    memberUids: data.memberUids ?? [],
    transitMetroId: data.transitMetroId,
    endedAt: data.endedAt,
  };
}

export async function endRemoteSession(sessionId: string): Promise<void> {
  await updateDoc(doc(sessionsCollection(), sessionId), {
    endedAt: new Date().toISOString(),
  });
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

export async function createRemoteAnnotation(
  sessionId: string,
  annotation: AnnotationRecord,
): Promise<void> {
  await addDoc(annotationsCollection(sessionId), {
    ...buildAnnotationDocument(annotation),
    createdAtServer: serverTimestamp(),
  });
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
