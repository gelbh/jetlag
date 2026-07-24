export const ORPHAN_CODE_SWEEP_LIMIT = 100;
export const ORPHAN_CODE_SWEEP_CURSOR_DOC = {
  collection: "systemConfig",
  id: "orphanCodeSweep",
};

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

function sessionCodesQuery(db, { limit, startAfterId }) {
  let query = db.collection("sessionCodes").orderBy("__name__").limit(limit);
  if (typeof startAfterId === "string" && startAfterId.length > 0) {
    query = query.startAfter(startAfterId);
  }
  return query;
}

async function readSweepCursor(db) {
  const snap = await db
    .collection(ORPHAN_CODE_SWEEP_CURSOR_DOC.collection)
    .doc(ORPHAN_CODE_SWEEP_CURSOR_DOC.id)
    .get();
  if (!snap.exists) {
    return null;
  }
  const lastCodeId = snap.data()?.lastCodeId;
  return typeof lastCodeId === "string" && lastCodeId.length > 0
    ? lastCodeId
    : null;
}

async function writeSweepCursor(db, lastCodeId) {
  await db
    .collection(ORPHAN_CODE_SWEEP_CURSOR_DOC.collection)
    .doc(ORPHAN_CODE_SWEEP_CURSOR_DOC.id)
    .set(
      {
        lastCodeId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
}

/**
 * Scan a page of sessionCodes and delete orphan / ended-session codes.
 * Advances a persisted cursor so repeated cron runs eventually cover the collection.
 * Returns number deleted.
 */
export async function sweepOrphanSessionCodes(
  db,
  { limit = ORPHAN_CODE_SWEEP_LIMIT } = {},
) {
  const startAfterId = await readSweepCursor(db);
  let codesSnap = await sessionCodesQuery(db, { limit, startAfterId }).get();

  // Past end of collection — wrap to the first page.
  if (codesSnap.empty && startAfterId) {
    codesSnap = await sessionCodesQuery(db, { limit, startAfterId: null }).get();
  }

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

  const lastDoc = codesSnap.docs[codesSnap.docs.length - 1];
  const nextCursor =
    codesSnap.docs.length < limit || lastDoc == null ? null : lastDoc.id;
  await writeSweepCursor(db, nextCursor);

  return orphans.length;
}
