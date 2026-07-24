export const ORPHAN_CODE_SWEEP_LIMIT = 100;

/** Orphan ⇔ no live session document (missing or already ended). */
export function isOrphanSession(sessionData) {
  if (sessionData == null) {
    return true;
  }

  if (sessionData.status === "ended" || typeof sessionData.endedAt === "string") {
    return true;
  }

  return false;
}

export function selectOrphanCodeDocs(codeDocsWithSessions, limit) {
  const selected = [];

  for (const entry of codeDocsWithSessions) {
    if (selected.length >= limit) {
      break;
    }

    if (isOrphanSession(entry.sessionData)) {
      selected.push(entry);
    }
  }

  return selected;
}

/**
 * Scan a page of sessionCodes and delete orphan / ended-session codes.
 * Returns number deleted.
 */
export async function sweepOrphanSessionCodes(
  db,
  { limit = ORPHAN_CODE_SWEEP_LIMIT } = {},
) {
  const codesSnap = await db
    .collection("sessionCodes")
    .orderBy("__name__")
    .limit(limit)
    .get();

  const withSessions = await Promise.all(
    codesSnap.docs.map(async (codeDoc) => {
      const codeData = codeDoc.data() ?? {};
      const sessionId =
        typeof codeData.sessionId === "string" ? codeData.sessionId : null;

      let sessionData = null;
      if (sessionId) {
        const sessionSnap = await db.collection("sessions").doc(sessionId).get();
        sessionData = sessionSnap.exists ? sessionSnap.data() : null;
      }

      return { codeDoc, codeData, sessionData };
    }),
  );

  const orphans = selectOrphanCodeDocs(withSessions, limit);
  await Promise.all(orphans.map((entry) => entry.codeDoc.ref.delete()));
  return orphans.length;
}
