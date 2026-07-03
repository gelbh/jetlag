export const ENDED_RETENTION_DAYS = 7;
export const ABANDONED_RETENTION_DAYS = 30;
export const PURGE_BATCH_LIMIT = 50;

export function computeEndedCutoffIso(
  now = Date.now(),
  retentionDays = ENDED_RETENTION_DAYS,
) {
  return new Date(
    now - retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function computeAbandonedCutoffIso(
  now = Date.now(),
  retentionDays = ABANDONED_RETENTION_DAYS,
) {
  return new Date(
    now - retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function isEndedSessionPastRetention(
  data,
  endedCutoffIso,
) {
  return (
    data.status === "ended" &&
    typeof data.endedAt === "string" &&
    data.endedAt < endedCutoffIso
  );
}

export function isAbandonedSessionPastRetention(
  data,
  abandonedCutoffIso,
) {
  if (data.status === "ended" || typeof data.endedAt === "string") {
    return false;
  }

  return (
    typeof data.createdAt === "string" && data.createdAt < abandonedCutoffIso
  );
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
