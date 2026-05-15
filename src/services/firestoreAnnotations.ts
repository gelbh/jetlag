import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import type { AnnotationRecord, GameArea, SessionRecord } from '../domain/annotations'
import { getFirestoreDb } from './firebase'
import { generateSessionCode } from './sessionCodes'

function sessionsCollection() {
  return collection(getFirestoreDb(), 'sessions')
}

function annotationsCollection(sessionId: string) {
  return collection(getFirestoreDb(), 'sessions', sessionId, 'annotations')
}

export async function createRemoteSession(
  gameArea: GameArea,
  hostUid: string,
): Promise<SessionRecord> {
  let code = generateSessionCode()
  let attempts = 0

  while (attempts < 8) {
    const existing = await getDocs(query(sessionsCollection(), where('code', '==', code)))
    if (existing.empty) {
      break
    }

    code = generateSessionCode()
    attempts += 1
  }

  const sessionRef = doc(sessionsCollection())
  const createdAt = new Date().toISOString()
  const session: SessionRecord = {
    id: sessionRef.id,
    code,
    gameArea,
    hostUid,
    createdAt,
    memberUids: [hostUid],
  }

  await setDoc(sessionRef, {
    code,
    gameArea,
    hostUid,
    createdAt,
    memberUids: [hostUid],
    createdAtServer: serverTimestamp(),
  })

  return session
}

export async function joinRemoteSessionByCode(
  code: string,
  uid: string,
): Promise<SessionRecord | null> {
  const snapshot = await getDocs(query(sessionsCollection(), where('code', '==', code)))

  if (snapshot.empty) {
    return null
  }

  const sessionDoc = snapshot.docs[0]
  const data = sessionDoc.data() as Omit<SessionRecord, 'id'>
  const memberUids = Array.from(new Set([...(data.memberUids ?? []), uid]))

  if (!data.memberUids?.includes(uid)) {
    await updateDoc(sessionDoc.ref, { memberUids })
  }

  return {
    id: sessionDoc.id,
    code: data.code,
    gameArea: data.gameArea,
    hostUid: data.hostUid,
    createdAt: data.createdAt,
    memberUids,
  }
}

export async function writeRemoteAnnotation(
  sessionId: string,
  annotation: AnnotationRecord,
): Promise<void> {
  const annotationRef = doc(annotationsCollection(sessionId), annotation.id)
  await setDoc(annotationRef, {
    type: annotation.type,
    geometry: annotation.geometry,
    metadata: annotation.metadata,
    status: annotation.status,
    updatedAt: serverTimestamp(),
  })
}

export async function createRemoteAnnotation(
  sessionId: string,
  annotation: AnnotationRecord,
): Promise<void> {
  await addDoc(annotationsCollection(sessionId), {
    type: annotation.type,
    geometry: annotation.geometry,
    metadata: annotation.metadata,
    status: annotation.status,
    createdAtServer: serverTimestamp(),
  })
}

export function subscribeToRemoteAnnotations(
  sessionId: string,
  onChange: (annotations: AnnotationRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    annotationsCollection(sessionId),
    (snapshot) => {
      const annotations = snapshot.docs.map((annotationDoc) => {
        const data = annotationDoc.data()
        return {
          id: annotationDoc.id,
          sessionId,
          type: data.type,
          geometry: data.geometry,
          metadata: data.metadata,
          status: data.status,
        } as AnnotationRecord
      })

      onChange(annotations)
    },
    (error) => onError(error),
  )
}
