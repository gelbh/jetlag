import {
  writeRemoteAnnotation,
  writeRemoteAnnotationsBatch,
} from "../firestore/firestoreAnnotations";
import {
  readOfflineQueueForSession,
  recordOfflineWriteFailure,
  removeOfflineWrite,
  shouldRetryOfflineWrite,
} from "./offlineQueue";

export interface FlushOfflineQueueResult {
  remaining: number;
  lastError: string | null;
}

export async function flushOfflineQueue(
  sessionId: string,
): Promise<FlushOfflineQueueResult> {
  const pendingForSession = await readOfflineQueueForSession(sessionId);

  if (pendingForSession.length === 0) {
    return { remaining: 0, lastError: null };
  }

  let lastError: string | null = null;
  const retryable = pendingForSession.filter((entry) =>
    shouldRetryOfflineWrite(entry),
  );

  if (retryable.length === 0) {
    return {
      remaining: pendingForSession.length,
      lastError: null,
    };
  }

  try {
    await writeRemoteAnnotationsBatch(
      sessionId,
      retryable.map((entry) => entry.annotation),
    );

    for (const entry of retryable) {
      await removeOfflineWrite(entry.id);
    }
  } catch {
    for (const entry of retryable) {
      try {
        await writeRemoteAnnotation(sessionId, entry.annotation);
        await removeOfflineWrite(entry.id);
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : "Sync failed.";
        await recordOfflineWriteFailure(entry.id);
      }
    }
  }

  const remaining = await readOfflineQueueForSession(sessionId);
  return {
    remaining: remaining.length,
    lastError,
  };
}
