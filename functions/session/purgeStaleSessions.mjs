export const ENDED_RETENTION_DAYS = 7;
export const ABANDONED_RETENTION_DAYS = 30;
export const PURGE_BATCH_LIMIT = 50;
/** Idle auto-end throughput (indexed + legacy fill) — higher than delete purge. */
export const IDLE_PURGE_BATCH_LIMIT = 200;

export function computeEndedCutoffIso(now = Date.now(), retentionDays = ENDED_RETENTION_DAYS) {
  return new Date(now - retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

export function computeAbandonedCutoffIso(
  now = Date.now(),
  retentionDays = ABANDONED_RETENTION_DAYS,
) {
  return new Date(now - retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

export function isEndedSessionPastRetention(data, endedCutoffIso) {
  return (
    data.status === "ended" && typeof data.endedAt === "string" && data.endedAt < endedCutoffIso
  );
}

export function isAbandonedSessionPastRetention(data, abandonedCutoffIso) {
  if (data.status === "ended" || typeof data.endedAt === "string") {
    return false;
  }

  return typeof data.createdAt === "string" && data.createdAt < abandonedCutoffIso;
}

export function selectSessionsToPurge(
  endedCandidates,
  abandonedCandidates,
  endedCutoffIso,
  abandonedCutoffIso,
  limit = PURGE_BATCH_LIMIT,
) {
  const selected = [];
  const seen = new Set();

  for (const snapshot of endedCandidates) {
    if (selected.length >= limit) {
      break;
    }

    const data = snapshot.data();
    if (!isEndedSessionPastRetention(data, endedCutoffIso)) {
      continue;
    }

    selected.push(snapshot);
    seen.add(snapshot.id);
  }

  for (const snapshot of abandonedCandidates) {
    if (selected.length >= limit) {
      break;
    }

    if (seen.has(snapshot.id)) {
      continue;
    }

    const data = snapshot.data();
    if (!isAbandonedSessionPastRetention(data, abandonedCutoffIso)) {
      continue;
    }

    selected.push(snapshot);
    seen.add(snapshot.id);
  }

  return selected;
}

async function deleteSessionCodeIfPresent(db, code) {
  if (typeof code !== "string" || code.length === 0) {
    return;
  }

  await db.collection("sessionCodes").doc(code).delete();
}

/**
 * Recursively delete selected session docs and their codes.
 * Continues the batch when one session fails so a single BulkWriter
 * aggregation error does not abort the rest of the purge.
 * Returns the number of sessions successfully deleted.
 */
export async function purgeSelectedSessions(db, targets, { captureException } = {}) {
  let deleted = 0;

  for (const sessionDoc of targets) {
    const code = sessionDoc.data().code;
    try {
      await db.recursiveDelete(sessionDoc.ref);
      await deleteSessionCodeIfPresent(db, code);
      deleted += 1;
    } catch (error) {
      console.error("purgeStaleSessions delete failed", sessionDoc.id, error);
      captureException?.(error);
    }
  }

  return deleted;
}
