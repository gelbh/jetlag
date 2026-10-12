import { useCallback } from "react";
import { isFirestorePermissionDenied } from "@/services/firestore/sessions/shared";
import { isRetriableSyncError } from "../../domain/device/sync/syncRetry";
import type { AnnotationRecord, SessionRecord } from "../../domain/map/annotations";
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
  enqueueOfflineWrites,
} from "../../services/session/offlineQueue";
import type { MapTool } from "../../state/sessionStore";
import { useAnnotationStore, useSessionStore } from "../../state/sessionStore";
import { shouldQueueAnnotationOffline } from "./shouldQueueAnnotationOffline";

export const ANNOTATION_PERMISSION_DENIED_MESSAGE =
  "Couldn't save that map change. The server rejected it.";

function annotationSyncErrorMessage(error: unknown): string {
  if (isFirestorePermissionDenied(error)) {
    return ANNOTATION_PERMISSION_DENIED_MESSAGE;
  }
  return error instanceof Error ? error.message : "Sync failed.";
}

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

  const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const softDeleteAnnotation = useAnnotationStore((state) => state.softDeleteAnnotation);
  const softDeleteAllForSession = useAnnotationStore((state) => state.softDeleteAllForSession);
  const pushRedoAnnotationId = useAnnotationStore((state) => state.pushRedoAnnotationId);
  const removeRedoAnnotationId = useAnnotationStore((state) => state.removeRedoAnnotationId);
  const clearRedoStack = useAnnotationStore((state) => state.clearRedoStack);
  const upsertAnnotation = useAnnotationStore((state) => state.upsertAnnotation);
  const markAnnotationPulse = useAnnotationStore((state) => state.markAnnotationPulse);

  const reportAnnotationWriteError = useCallback(
    (error: unknown): string => {
      const message = annotationSyncErrorMessage(error);
      setLastSyncError(message);
      return message;
    },
    [setLastSyncError],
  );

  // Resetting pendingWrites to the queue count absorbs the caller's increment,
  // so callers must not also decrement it. Leaving it up until the reset keeps
  // the sync indicator from flashing "synced".
  // ponytail: resetting to the queue count drops in-flight increments from
  // concurrent remote writes; separate queued and in-flight counters fix that.
  const queueAnnotationWrites = useCallback(
    async (sessionId: string, annotations: readonly AnnotationRecord[]): Promise<string | null> => {
      try {
        await enqueueOfflineWrites(sessionId, annotations);
        await registerAnnotationBackgroundSync();
        setPendingWrites(await countOfflineQueueForSession(sessionId));
        return null;
      } catch (queueError) {
        decrementPendingWrites();
        return reportAnnotationWriteError(queueError);
      }
    },
    [decrementPendingWrites, reportAnnotationWriteError, setPendingWrites],
  );

  // Edit/delete/undo/redo/clear are fire-and-forget from UI handlers (`void
  // deleteAnnotation(id)`), so persistence never rejects: retriable errors go
  // to the offline queue, anything else surfaces via lastSyncError and is
  // returned so awaiting callers (createAnnotation) can react.
  const persistAnnotations = useCallback(
    async (
      remoteSession: SessionRecord,
      annotations: readonly AnnotationRecord[],
      write: (sessionId: string) => Promise<void>,
    ): Promise<string | null> => {
      incrementPendingWrites();
      incrementSyncInFlight();
      setLastSyncError(null);

      let failure: { error: unknown } | undefined;
      let queueOffline = false;
      try {
        const user = await ensureAnonymousUser();

        if (shouldQueueAnnotationOffline()) {
          queueOffline = true;
        } else {
          await withSessionWriteAccess({
            session: remoteSession,
            uid: user.uid,
            myUid,
            onSessionChange: (next) => setSession(next, user.uid),
            write,
          });
        }
      } catch (error) {
        failure = { error };
      }

      decrementSyncInFlight();

      if (queueOffline || (failure && isRetriableSyncError(failure.error))) {
        return queueAnnotationWrites(remoteSession.id, annotations);
      }
      decrementPendingWrites();
      return failure ? reportAnnotationWriteError(failure.error) : null;
    },
    [
      decrementPendingWrites,
      decrementSyncInFlight,
      incrementPendingWrites,
      incrementSyncInFlight,
      myUid,
      queueAnnotationWrites,
      reportAnnotationWriteError,
      setLastSyncError,
      setSession,
    ],
  );

  const persistAnnotation = useCallback(
    async (annotation: AnnotationRecord): Promise<string | null> => {
      if (!session || session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
        return null;
      }

      const stampedAnnotation: AnnotationRecord = {
        ...annotation,
        updatedAt: new Date().toISOString(),
      };

      return persistAnnotations(session, [stampedAnnotation], (sessionId) =>
        writeRemoteAnnotation(sessionId, stampedAnnotation),
      );
    },
    [persistAnnotations, session],
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
      // Question commits await this and keep their draft / cancel on failure,
      // so creation still rejects (error already in lastSyncError) and the
      // server-rejected annotation must not linger locally for other tools.
      const failure = await persistAnnotation(created);
      if (failure) {
        useAnnotationStore.setState((state) => ({
          annotations: state.annotations.filter((item) => item.id !== created.id),
        }));
        throw new Error(failure);
      }
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

    const deleted = active.map(
      (annotation): AnnotationRecord => ({
        ...annotation,
        status: "deleted",
        updatedAt: new Date().toISOString(),
      }),
    );

    await persistAnnotations(session, deleted, (sessionId) =>
      writeRemoteAnnotationsBatch(sessionId, deleted),
    );
  }, [clearRedoStack, persistAnnotations, session, softDeleteAllForSession]);

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
