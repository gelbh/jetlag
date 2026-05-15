import { useCallback } from 'react'
import type { AnnotationRecord } from '../domain/annotations'
import { LOCAL_SESSION_ID } from '../domain/annotations'
import { useAnnotationStore, useSessionStore } from '../state/sessionStore'
import { isFirebaseConfigured } from '../services/firebase'
import { writeRemoteAnnotation } from '../services/firestoreAnnotations'
import { enqueueOfflineWrite } from '../services/offlineQueue'

export function useAnnotations() {
  const session = useSessionStore((state) => state.session)
  const incrementPendingWrites = useSessionStore((state) => state.incrementPendingWrites)
  const decrementPendingWrites = useSessionStore((state) => state.decrementPendingWrites)
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation)
  const softDeleteAnnotation = useAnnotationStore((state) => state.softDeleteAnnotation)
  const upsertAnnotation = useAnnotationStore((state) => state.upsertAnnotation)
  const markAnnotationPulse = useAnnotationStore((state) => state.markAnnotationPulse)

  const persistAnnotation = useCallback(
    async (annotation: AnnotationRecord) => {
      if (!session || session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
        return
      }

      incrementPendingWrites()

      try {
        if (!navigator.onLine) {
          await enqueueOfflineWrite(session.id, annotation)
          return
        }

        await writeRemoteAnnotation(session.id, annotation)
      } finally {
        decrementPendingWrites()
      }
    },
    [decrementPendingWrites, incrementPendingWrites, session],
  )

  const createAnnotation = useCallback(
    async (
      annotation: Omit<AnnotationRecord, 'id' | 'sessionId' | 'status'> & {
        id?: string
        sessionId?: string
      },
    ) => {
      const created = addAnnotation({
        ...annotation,
        sessionId: session?.id ?? LOCAL_SESSION_ID,
      })

      markAnnotationPulse(created.id)
      await persistAnnotation(created)
      return created
    },
    [addAnnotation, markAnnotationPulse, persistAnnotation, session?.id],
  )

  const deleteAnnotation = useCallback(
    async (id: string) => {
      const existing = useAnnotationStore.getState().annotations.find((item) => item.id === id)
      if (!existing) {
        return
      }

      const deleted: AnnotationRecord = { ...existing, status: 'deleted' }
      softDeleteAnnotation(id)
      await persistAnnotation(deleted)
    },
    [persistAnnotation, softDeleteAnnotation],
  )

  const replaceAnnotations = useCallback(
    (annotations: AnnotationRecord[]) => {
      useAnnotationStore.getState().setAnnotations(annotations)
    },
    [],
  )

  const mergeRemoteAnnotation = useCallback(
    (annotation: AnnotationRecord) => {
      upsertAnnotation(annotation)
      markAnnotationPulse(annotation.id)
    },
    [markAnnotationPulse, upsertAnnotation],
  )

  return {
    createAnnotation,
    deleteAnnotation,
    replaceAnnotations,
    mergeRemoteAnnotation,
  }
}
