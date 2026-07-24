export function isOrphanSessionCode(codeData, sessionData) {
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

    if (isOrphanSessionCode(entry.codeData, entry.sessionData)) {
      selected.push(entry);
    }
  }

  return selected;
}

/**
 * Scan a page of sessionCodes and delete orphan / ended-session codes.
 * Returns number deleted.
 */
export async function sweepOrphanSessionCodes(db, { limit = 100 } = {}) {
  const codesSnap = await db.collection("sessionCodes").limit(limit).get();
  let orphansDeleted = 0;

  for (const codeDoc of codesSnap.docs) {
    const codeData = codeDoc.data() ?? {};
    const sessionId =
      typeof codeData.sessionId === "string" ? codeData.sessionId : null;

    let sessionData = null;
    if (sessionId) {
      const sessionSnap = await db.collection("sessions").doc(sessionId).get();
      sessionData = sessionSnap.exists ? sessionSnap.data() : null;
    }

    if (!isOrphanSessionCode(codeData, sessionData)) {
      continue;
    }

    await codeDoc.ref.delete();
    orphansDeleted += 1;
  }

  return orphansDeleted;
}
