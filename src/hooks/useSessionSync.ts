import { useEffect } from "react";
import { LOCAL_SESSION_ID, migrateAnnotations } from "../domain/annotations";
import { useAnnotationStore, useSessionStore } from "../state/sessionStore";
import {
  getFirestoreDb,
  isFirebaseConfigured,
  isFirestorePersistenceUnavailable,
} from "../services/firebase";
import { subscribeToRemoteAnnotations } from "../services/firestoreAnnotations";
import {
  readOfflineQueueForSession,
  recordOfflineWriteFailure,
  removeOfflineWrite,
  shouldRetryOfflineWrite,
} from "../services/offlineQueue";
import { writeRemoteAnnotation } from "../services/firestoreAnnotations";

export function useSessionSync() {
  const session = useSessionStore((state) => state.session);
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

    getFirestoreDb();
    if (isFirestorePersistenceUnavailable()) {
      setLastSyncError(
        "Offline cache unavailable in this browser tab. Sync may be less reliable until you reload.",
      );
    }

    const unsubscribe = subscribeToRemoteAnnotations(
      session.id,
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
            : "Unable to sync annotations.",
        );
      },
    );

    return unsubscribe;
  }, [
    markAnnotationPulse,
    replaceAnnotations,
    session,
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

    const flushQueue = async () => {
      const pendingForSession = await readOfflineQueueForSession(session.id);
      setPendingWrites(pendingForSession.length);

      let lastError: string | null = null;

      for (const entry of pendingForSession) {
        if (!shouldRetryOfflineWrite(entry)) {
          continue;
        }

        try {
          await writeRemoteAnnotation(session.id, entry.annotation);
          await removeOfflineWrite(entry.id);
        } catch (error) {
          lastError =
            error instanceof Error ? error.message : "Unable to sync changes.";
          await recordOfflineWriteFailure(entry.id);
        }
      }

      if (lastError) {
        setLastSyncError(lastError);
      }

      const remaining = await readOfflineQueueForSession(session.id);
      setPendingWrites(remaining.length);
    };

    const handleOnline = () => {
      void flushQueue();
    };

    window.addEventListener("online", handleOnline);
    void flushQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [session, setLastSyncError, setPendingWrites]);

  useEffect(() => {
    const handleOffline = () => {
      if (!session || session.id === LOCAL_SESSION_ID) {
        return;
      }

      void (async () => {
        const queue = await readOfflineQueueForSession(session.id);
        setPendingWrites(queue.length);
      })();
    };

    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("offline", handleOffline);
    };
  }, [session, setPendingWrites]);
}
