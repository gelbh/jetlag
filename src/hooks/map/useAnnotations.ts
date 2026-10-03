import { useCallback } from "react";
import { isRetriableSyncError } from "../../domain/device/sync/syncRetry";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { LOCAL_SESSION_ID, migrateAnnotations } from "../../domain/map/annotations";
import { findLastRedoableAnnotation, findLastUndoableAnnotation } from "../../domain/map/mapTools";
import { ensureAnonymousUser, isFirebaseConfigured } from "../../services/core/firebase/firebase";
import {
  writeRemoteAnnotation,
  writeRemoteAnnotationsBatch,
} from "../../services/firestore/firestoreAnnotations";
import { withSessionWriteAccess } from "../../services/firestore/sessionMembershipHeal";
import { registerAnnotationBackgroundSync } from "../../services/session/backgroundSync";
import {
  countOfflineQueueForSession,
  enqueueOfflineWrite,
} from "../../services/session/offlineQueue";
import type { MapTool } from "../../state/sessionStore";
import { useAnnotationStore, useSessionStore } from "../../state/sessionStore";
import { shouldQueueAnnotationOffline } from "./shouldQueueAnnotationOffline";

export function useAnnotations() {
  const session = useSessionStore((state) => state.session);
  const incrementPendingWrites = useSessionStore((state) => state.incrementPendingWrites);
  const decrementPendingWrites = useSessionStore((state) => state.decrementPendingWrites);
  const incrementSyncInFlight = useSessionStore((state) => state.incrementSyncInFlight);
  const decrementSyncInFlight = useSessionStore((state) => state.decrementSyncInFlight);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);
  const setPendingWrites = useSessionStore((state) => state.setPendingWrites);
  const setSession = useSessionStore((state) => state.setSession);
  const myUid = useSessionStore((state) => state.myUid);

  const queueAnnotationWrite = useCallback(
    async (sessionId: string, annotation: AnnotationRecord) => {
      await enqueueOfflineWrite(sessionId, annotation);
      await registerAnnotationBackgroundSync();
      setPendingWrites(await countOfflineQueueForSession(sessionId));
    },
    [setPendingWrites],
  );
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const softDeleteAnnotation = useAnnotationStore((state) => state.softDeleteAnnotation);
  const softDeleteAllForSession = useAnnotationStore((state) => state.softDeleteAllForSession);
  const pushRedoAnnotationId = useAnnotationStore((state) => state.pushRedoAnnotationId);
  const removeRedoAnnotationId = useAnnotationStore((state) => state.removeRedoAnnotationId);
  const clearRedoStack = useAnnotationStore((state) => state.clearRedoStack);
  const upsertAnnotation = useAnnotationStore((state) => state.upsertAnnotation);
  const markAnnotationPulse = useAnnotationStore((state) => state.markAnnotationPulse);

  const persistAnnotation = useCallback(
    async (annotation: AnnotationRecord) => {
      if (!session || session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
        return;
      }

      incrementPendingWrites();
      incrementSyncInFlight();
      setLastSyncError(null);

      const stampedAnnotation: AnnotationRecord = {
        ...annotation,
        updatedAt: new Date().toISOString(),
      };

      try {
        const user = await ensureAnonymousUser();

        if (shouldQueueAnnotationOffline()) {
          await queueAnnotationWrite(session.id, stampedAnnotation);
          return;
        }

        await withSessionWriteAccess({
          session,
          uid: user.uid,
          myUid,
          onSessionChange: (next) => setSession(next, user.uid),
          write: (sessionId) => writeRemoteAnnotation(sessionId, stampedAnnotation),
        });
      } catch (error) {
        if (isRetriableSyncError(error)) {
          await queueAnnotationWrite(session.id, stampedAnnotation);
          return;
        }

        const message = error instanceof Error ? error.message : "Sync failed.";
        setLastSyncError(message);
        throw new Error(message, { cause: error });
      } finally {
        decrementSyncInFlight();
        decrementPendingWrites();
      }
    },
    [
      decrementPendingWrites,
      decrementSyncInFlight,
      incrementPendingWrites,
      incrementSyncInFlight,
      session,
      queueAnnotationWrite,
      setLastSyncError,
      setSession,
      myUid,
    ],
  );

  const createAnnotation = useCallback(
    async (
      annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status"> & {
        id?: string;
        sessionId?: string;
      },
    ) => {
      const created = addAnnotation({
        ...annotation,
        sessionId: session?.id ?? LOCAL_SESSION_ID,
      });

      clearRedoStack();
      markAnnotationPulse(created.id);
      await persistAnnotation(created);
      return created;
    },
    [addAnnotation, clearRedoStack, markAnnotationPulse, persistAnnotation, session?.id],
  );

  const deleteAnnotation = useCallback(
    async (id: string) => {
      const existing = useAnnotationStore.getState().annotations.find((item) => item.id === id);
      if (!existing) {
        return;
      }

      clearRedoStack();
      const deleted: AnnotationRecord = { ...existing, status: "deleted" };
      softDeleteAnnotation(id);
      await persistAnnotation(deleted);
    },
    [clearRedoStack, persistAnnotation, softDeleteAnnotation],
  );

  const replaceAnnotations = useCallback((annotations: AnnotationRecord[]) => {
    useAnnotationStore.getState().setAnnotations(migrateAnnotations(annotations));
  }, []);

  const mergeRemoteAnnotation = useCallback(
    (annotation: AnnotationRecord) => {
      upsertAnnotation(migrateAnnotations([annotation])[0]!);
      markAnnotationPulse(annotation.id);
    },
    [markAnnotationPulse, upsertAnnotation],
  );

  const updateAnnotation = useCallback(
    async (annotation: AnnotationRecord) => {
      const existing = useAnnotationStore
        .getState()
        .annotations.find((item) => item.id === annotation.id);
      if (!existing) {
        return;
      }

      upsertAnnotation(annotation);
      markAnnotationPulse(annotation.id);
      await persistAnnotation(annotation);
    },
    [markAnnotationPulse, persistAnnotation, upsertAnnotation],
  );

  const undoLastAnnotation = useCallback(
    async (tool?: MapTool) => {
      if (!session) {
        return;
      }

      const lastActive = findLastUndoableAnnotation(
        useAnnotationStore.getState().annotations,
        session.id,
        tool,
      );

      if (!lastActive) {
        return;
      }

      const deleted: AnnotationRecord = { ...lastActive, status: "deleted" };
      softDeleteAnnotation(lastActive.id);
      pushRedoAnnotationId(lastActive.id);
      await persistAnnotation(deleted);
    },
    [persistAnnotation, pushRedoAnnotationId, session, softDeleteAnnotation],
  );

  const redoLastAnnotation = useCallback(
    async (tool?: MapTool) => {
      if (!session) {
        return;
      }

      const { annotations, redoAnnotationIds } = useAnnotationStore.getState();
      const lastDeleted = findLastRedoableAnnotation(
        annotations,
        session.id,
        redoAnnotationIds,
        tool,
      );

      if (!lastDeleted) {
        return;
      }

      const restored: AnnotationRecord = { ...lastDeleted, status: "active" };
      upsertAnnotation(restored);
      removeRedoAnnotationId(lastDeleted.id);
      markAnnotationPulse(restored.id);
      await persistAnnotation(restored);
    },
    [markAnnotationPulse, persistAnnotation, removeRedoAnnotationId, session, upsertAnnotation],
  );

  const clearAllAnnotations = useCallback(async () => {
    if (!session) {
      return;
    }

    clearRedoStack();
    const active = useAnnotationStore
      .getState()
      .annotations.filter(
        (annotation) => annotation.sessionId === session.id && annotation.status === "active",
      );

    if (active.length === 0) {
      return;
    }

    softDeleteAllForSession(session.id);

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      return;
    }

    incrementPendingWrites();
    incrementSyncInFlight();
    setLastSyncError(null);

    try {
      const user = await ensureAnonymousUser();
      const deleted = active.map(
        (annotation): AnnotationRecord => ({
          ...annotation,
          status: "deleted",
          updatedAt: new Date().toISOString(),
        }),
      );

      if (shouldQueueAnnotationOffline()) {
        for (const annotation of deleted) {
          await queueAnnotationWrite(session.id, annotation);
        }
        return;
      }

      await withSessionWriteAccess({
        session,
        uid: user.uid,
        myUid,
        onSessionChange: (next) => setSession(next, user.uid),
        write: (sessionId) => writeRemoteAnnotationsBatch(sessionId, deleted),
      });
    } catch (error) {
      if (isRetriableSyncError(error)) {
        const deleted = active.map(
          (annotation): AnnotationRecord => ({
            ...annotation,
            status: "deleted",
            updatedAt: new Date().toISOString(),
          }),
        );

        for (const annotation of deleted) {
          await queueAnnotationWrite(session.id, annotation);
        }
        return;
      }

      const message = error instanceof Error ? error.message : "Sync failed.";
      setLastSyncError(message);
      throw new Error(message, { cause: error });
    } finally {
      decrementSyncInFlight();
      decrementPendingWrites();
    }
  }, [
    clearRedoStack,
    decrementPendingWrites,
    decrementSyncInFlight,
    incrementPendingWrites,
    incrementSyncInFlight,
    queueAnnotationWrite,
    myUid,
    session,
    setLastSyncError,
    setSession,
    softDeleteAllForSession,
  ]);

  return {
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    undoLastAnnotation,
    redoLastAnnotation,
    clearAllAnnotations,
    replaceAnnotations,
    mergeRemoteAnnotation,
  };
}
