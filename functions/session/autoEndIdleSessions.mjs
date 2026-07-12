import { FieldValue } from "firebase-admin/firestore";

export const IDLE_SESSION_HOURS = 24;

export function computeIdleCutoffIso(
  now = Date.now(),
  hours = IDLE_SESSION_HOURS,
) {
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

export function getEffectiveLastActiveAt(data) {
  if (typeof data.lastActiveAt === "string") {
    return data.lastActiveAt;
  }

  if (typeof data.createdAt === "string") {
    return data.createdAt;
  }

  return null;
}

export function isIdleActiveSession(data, idleCutoffIso) {
  if (data.status === "ended" || typeof data.endedAt === "string") {
    return false;
  }

  const effectiveLastActive = getEffectiveLastActiveAt(data);
  return (
    effectiveLastActive != null && effectiveLastActive < idleCutoffIso
  );
}

export function selectIdleActiveSessions(
  indexedCandidates,
  legacyCandidates,
  idleCutoffIso,
  limit,
) {
  const selected = [];
  const seen = new Set();

  for (const snapshot of [...indexedCandidates, ...legacyCandidates]) {
    if (selected.length >= limit) {
      break;
    }

    if (seen.has(snapshot.id)) {
      continue;
    }

    const data = snapshot.data();
    if (!isIdleActiveSession(data, idleCutoffIso)) {
      continue;
    }

    selected.push(snapshot);
    seen.add(snapshot.id);
  }

  return selected;
}

export async function autoEndIdleSession(db, sessionDoc) {
  const data = sessionDoc.data();
  const code = typeof data.code === "string" ? data.code : null;

  await sessionDoc.ref.update({
    endedAt: new Date().toISOString(),
    status: "ended",
    code: FieldValue.delete(),
  });

  if (code) {
    await db.collection("sessionCodes").doc(code).delete();
  }
}
