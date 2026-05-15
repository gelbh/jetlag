import { useEffect } from 'react'
import { LOCAL_SESSION_ID } from '../domain/annotations'
import { useAnnotationStore, useSessionStore } from '../state/sessionStore'
import { isFirebaseConfigured, enableOfflinePersistence } from '../services/firebase'
import { subscribeToRemoteAnnotations } from '../services/firestoreAnnotations'
import {
  enqueueOfflineWrite,
  readOfflineQueue,
  removeOfflineWrite,
} from '../services/offlineQueue'
import { writeRemoteAnnotation } from '../services/firestoreAnnotations'

export function useSessionSync() {
  const session = useSessionStore((state) => state.session)
  const setPendingWrites = useSessionStore((state) => state.setPendingWrites)
  const replaceAnnotations = useAnnotationStore((state) => state.setAnnotations)
  const markAnnotationPulse = useAnnotationStore((state) => state.markAnnotationPulse)

  useEffect(() => {
    if (!session || session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      return
    }

    void enableOfflinePersistence()

    const unsubscribe = subscribeToRemoteAnnotations(
      session.id,
      (annotations) => {
        const previous = useAnnotationStore.getState().annotations
        const previousIds = new Set(previous.map((annotation) => annotation.id))

        replaceAnnotations(annotations)

        annotations.forEach((annotation) => {
          if (!previousIds.has(annotation.id) && annotation.status === 'active') {
            markAnnotationPulse(annotation.id)
          }
        })
      },
      () => undefined,
    )

    return unsubscribe
  }, [markAnnotationPulse, replaceAnnotations, session])

  useEffect(() => {
    if (!session || session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      return
    }

    const flushQueue = async () => {
      const queue = await readOfflineQueue()
      const pendingForSession = queue.filter((entry) => entry.sessionId === session.id)
      setPendingWrites(pendingForSession.length)

      for (const entry of pendingForSession) {
        try {
          await writeRemoteAnnotation(session.id, entry.annotation)
          await removeOfflineWrite(entry.id)
        } catch {
          break
        }
      }

      const remaining = await readOfflineQueue()
      setPendingWrites(remaining.filter((entry) => entry.sessionId === session.id).length)
    }

    const handleOnline = () => {
      void flushQueue()
    }

    window.addEventListener('online', handleOnline)
    void flushQueue()

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [session, setPendingWrites])

  useEffect(() => {
    const handleOffline = async () => {
      if (!session || session.id === LOCAL_SESSION_ID) {
        return
      }

      const queue = await readOfflineQueue()
      setPendingWrites(queue.filter((entry) => entry.sessionId === session.id).length)
    }

    window.addEventListener('offline', () => {
      void handleOffline()
    })

    return () => {
      window.removeEventListener('offline', () => {
        void handleOffline()
      })
    }
  }, [session, setPendingWrites])
}

export async function queueAnnotationIfOffline(
  sessionId: string,
  annotation: Parameters<typeof enqueueOfflineWrite>[1],
) {
  if (!navigator.onLine) {
    await enqueueOfflineWrite(sessionId, annotation)
  }
}
