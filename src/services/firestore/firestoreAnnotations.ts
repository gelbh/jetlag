import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { getFirestoreDb } from "../core/firebase";
import {
  buildAnnotationDocument,
  deserializeAnnotationFromFirestore,
} from "./serialization/serializeAnnotation";

export {
  isReclaimableSessionForCode,
  isFirestorePermissionDenied,
  ensureRemoteSessionMembership,
  ensureRemoteSessionWriteAccess,
  createRemoteSession,
  lookupRemoteSessionByCode,
  joinRemoteSessionByCode,
  getRemoteSessionById,
  getRemoteSessionByIdFromServer,
  waitForServerHiderRole,
  ensureHiderPhotoUploadAccess,
  endRemoteSession,
  updateSessionTimer,
  updateSessionRules,
  requestEndGameSession,
  acceptEndGameSession,
  startEndGameSession,
  touchSessionLastActive,
  resetEndGameSession,
  requestFoundHiderSession,
  confirmFoundHiderSession,
  resetFoundHiderSession,
  resetRemoteSession,
  subscribeToSession,
  JOIN_AUTH_FAILURE_MESSAGE,
  type EnsureRemoteSessionMembershipOptions,
} from "./firestoreSessions";

function annotationsCollection(sessionId: string) {
  return collection(getFirestoreDb(), "sessions", sessionId, "annotations");
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
