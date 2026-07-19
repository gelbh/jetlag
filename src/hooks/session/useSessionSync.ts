import { useEffect } from "react";
import { LOCAL_SESSION_ID, migrateAnnotations } from "../../domain/map/annotations";
import { getPowerProfile } from "../../domain/device/powerProfile";
import { useAnnotationStore, useMapStore, useSessionStore } from "../../state/sessionStore";
import {
  getFirestoreDb,
  isFirebaseConfigured,
  isFirestorePersistenceUnavailable,
} from "../../services/core/firebase";
import {
  subscribeToRemoteAnnotations,
  subscribeToSession,
} from "../../services/firestore/firestoreAnnotations";
import { ANNOTATION_SYNC_MESSAGE_TYPE } from "../../services/session/backgroundSync";
import { readOfflineQueueForSession } from "../../services/session/offlineQueue";
import { flushOfflineQueue } from "../../services/session/flushOfflineQueue";


export interface UseSessionSyncOptions {
  syncEnabled?: boolean;
}

export function useSessionSync({ syncEnabled = true }: UseSessionSyncOptions = {}) {
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const queueFlushMs = getPowerProfile(lowPowerMode).queueFlushMs;
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
      !syncEnabled ||
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resubscribe on session id only
  }, [myUid, session?.id, setLastSyncError, setSession, syncEnabled]);

  useEffect(() => {
    if (
      !syncEnabled ||
      !session ||
      session.id === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    const sessionId = session.id;
    let hasBaseline = false;

    replaceAnnotations([]);

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

        if (!hasBaseline) {
          hasBaseline = true;
          replaceAnnotations(migrateAnnotations(annotations));
          return;
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resubscribe on session id only
  }, [
    markAnnotationPulse,
    replaceAnnotations,
    session?.id,
    setLastSyncError,
    setRemoteUpdateNotice,
    syncEnabled,
  ]);

  useEffect(() => {
    if (
      !syncEnabled ||
      !session ||
      session.id === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    const sessionId = session.id;
    let disposed = false;

    const flushQueue = async () => {
      if (disposed) {
        return;
      }

      const pendingForSession = await readOfflineQueueForSession(sessionId);
      if (disposed) {
        return;
      }
      setPendingWrites(pendingForSession.length);

      if (pendingForSession.length === 0) {
        return;
      }

      const { remaining, lastError } = await flushOfflineQueue(sessionId);
      if (disposed) {
        return;
      }
      setPendingWrites(remaining);
      setLastSyncError(lastError);
    };

    const handleOnline = () => {
      void flushQueue();
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== ANNOTATION_SYNC_MESSAGE_TYPE) {
        return;
      }
      void flushQueue();
    };

    window.addEventListener("online", handleOnline);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    }
    void flushQueue();

    const intervalId = window.setInterval(() => {
      void flushQueue();
    }, queueFlushMs);

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "message",
          handleServiceWorkerMessage,
        );
      }
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resubscribe on session id only
  }, [queueFlushMs, session?.id, setLastSyncError, setPendingWrites, syncEnabled]);

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
