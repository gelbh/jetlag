import { useEffect } from "react";
import { LOCAL_SESSION_ID, migrateAnnotations } from "../domain/annotations";
import { useAnnotationStore, useSessionStore } from "../state/sessionStore";
import {
  getFirestoreDb,
  isFirebaseConfigured,
  isFirestorePersistenceUnavailable,
} from "../services/firebase";
import {
  subscribeToRemoteAnnotations,
  subscribeToSession,
  writeRemoteAnnotation,
} from "../services/firestoreAnnotations";
import {
  readOfflineQueueForSession,
  recordOfflineWriteFailure,
  removeOfflineWrite,
  shouldRetryOfflineWrite,
} from "../services/offlineQueue";

const QUEUE_FLUSH_INTERVAL_MS = 45_000;

export function useSessionSync() {
  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const setSession = useSessionStore((state) => state.setSession);
  const setPendingWrites = useSessionStore((state) => state.setPendingWrites);
  const setRemoteUpdateNotice = useSessionStore(
    (state) => state.setRemoteUpdateNotice,
  );
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);
  const replaceAnnotations = useAnnotationStore(
    (state) => state.setAnnotations,
  );
  const markAnnotationPulse = useAnnotationStore(
    (state) => state.markAnnotationPulse,
  );

  useEffect(() => {
    if (
      !session ||
      session.id === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    const unsubscribe = subscribeToSession(
      session.id,
      (remoteSession) => {
        setSession(remoteSession, myUid);
      },
      (error) => {
        setLastSyncError(
          error instanceof Error ? error.message : "Session sync failed.",
        );
      },
    );

    return unsubscribe;
  }, [myUid, session?.id, setLastSyncError, setSession]);

  useEffect(() => {
    if (
      !session ||
      session.id === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    const sessionId = session.id;

    getFirestoreDb();
    if (isFirestorePersistenceUnavailable()) {
      setLastSyncError(
        "Offline cache unavailable in this browser tab. Sync may be less reliable until you reload.",
      );
    }

    const unsubscribe = subscribeToRemoteAnnotations(
      sessionId,
      (annotations) => {
        const previous = useAnnotationStore.getState().annotations;
        const previousById = new Map(
          previous.map((annotation) => [annotation.id, annotation]),
        );

        for (const annotation of annotations) {
          const prior = previousById.get(annotation.id);
          if (
            prior &&
            prior.status === "active" &&
            annotation.updatedAt &&
            prior.updatedAt &&
            prior.updatedAt !== annotation.updatedAt
          ) {
            setRemoteUpdateNotice("Map updated from another device.");
            break;
          }
        }

        const previousIds = new Set(
          previous.map((annotation) => annotation.id),
        );

        replaceAnnotations(migrateAnnotations(annotations));

        annotations.forEach((annotation) => {
          if (
            !previousIds.has(annotation.id) &&
            annotation.status === "active"
          ) {
            markAnnotationPulse(annotation.id);
          }
        });
      },
      (error) => {
        setLastSyncError(
          error instanceof Error
            ? error.message
            : "Annotation sync failed.",
        );
      },
    );

    return unsubscribe;
  }, [
    markAnnotationPulse,
    replaceAnnotations,
    session?.id,
    setLastSyncError,
    setRemoteUpdateNotice,
  ]);

  useEffect(() => {
    if (
      !session ||
      session.id === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    const sessionId = session.id;

    const flushQueue = async () => {
      const pendingForSession = await readOfflineQueueForSession(sessionId);
      setPendingWrites(pendingForSession.length);

      if (pendingForSession.length === 0) {
        return;
      }

      let lastError: string | null = null;

      for (const entry of pendingForSession) {
        if (!shouldRetryOfflineWrite(entry)) {
          continue;
        }

        try {
          await writeRemoteAnnotation(sessionId, entry.annotation);
          await removeOfflineWrite(entry.id);
        } catch (error) {
          lastError =
            error instanceof Error ? error.message : "Sync failed.";
          await recordOfflineWriteFailure(entry.id);
        }
      }

      if (lastError) {
        setLastSyncError(lastError);
      } else {
        setLastSyncError(null);
      }

      const remaining = await readOfflineQueueForSession(sessionId);
      setPendingWrites(remaining.length);
    };

    const handleOnline = () => {
      void flushQueue();
    };

    window.addEventListener("online", handleOnline);
    void flushQueue();

    const intervalId = window.setInterval(() => {
      void flushQueue();
    }, QUEUE_FLUSH_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.clearInterval(intervalId);
    };
  }, [session?.id, setLastSyncError, setPendingWrites]);

  useEffect(() => {
    const handleOffline = () => {
      const currentSession = useSessionStore.getState().session;
      if (!currentSession || currentSession.id === LOCAL_SESSION_ID) {
        return;
      }

      void (async () => {
        const queue = await readOfflineQueueForSession(currentSession.id);
        setPendingWrites(queue.length);
      })();
    };

    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("offline", handleOffline);
    };
  }, [setPendingWrites]);
}
