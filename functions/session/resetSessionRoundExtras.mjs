const FIRESTORE_BATCH_LIMIT = 500;

const CANCELABLE_QUESTION_STATUSES = new Set([
  "pending",
  "walking",
  "answered",
]);

async function commitInChunks(db, refs, apply) {
  for (let i = 0; i < refs.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
      apply(batch, ref);
    }
    await batch.commit();
  }
}

function sessionCollection(db, sessionId, name) {
  return db.collection("sessions").doc(sessionId).collection(name);
}

async function softDeleteActiveAnnotations(db, sessionId) {
  const snapshot = await sessionCollection(db, sessionId, "annotations")
    .where("status", "==", "active")
    .get();
  if (snapshot.empty) {
    return;
  }

  const updatedAt = new Date().toISOString();
  await commitInChunks(
    db,
    snapshot.docs.map((doc) => doc.ref),
    (batch, ref) => {
      batch.update(ref, { status: "deleted", updatedAt });
    },
  );
}

async function cancelOpenPendingQuestions(db, sessionId) {
  const snapshot = await sessionCollection(
    db,
    sessionId,
    "pendingQuestions",
  ).get();
  if (snapshot.empty) {
    return;
  }

  const refs = snapshot.docs
    .filter((doc) => CANCELABLE_QUESTION_STATUSES.has(doc.data()?.status))
    .map((doc) => doc.ref);

  await commitInChunks(db, refs, (batch, ref) => {
    batch.update(ref, { status: "cancelled" });
  });
}

async function deleteCollectionDocs(db, sessionId, collectionName) {
  const snapshot = await sessionCollection(db, sessionId, collectionName).get();
  if (snapshot.empty) {
    return;
  }

  await commitInChunks(
    db,
    snapshot.docs.map((doc) => doc.ref),
    (batch, ref) => {
      batch.delete(ref);
    },
  );
}

async function deleteDocIfExists(db, sessionId, collectionName, docId) {
  const ref = sessionCollection(db, sessionId, collectionName).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) {
    return;
  }
  await commitInChunks(db, [ref], (batch, docRef) => {
    batch.delete(docRef);
  });
}

async function deletePlayerTrailPoints(db, sessionId, memberUids) {
  for (const uid of memberUids) {
    if (typeof uid !== "string" || !uid) {
      continue;
    }
    try {
      const pointsRef = sessionCollection(db, sessionId, "playerTrailPoints")
        .doc(uid)
        .collection("points");
      const snapshot = await pointsRef.get();
      if (snapshot.empty) {
        continue;
      }
      await commitInChunks(
        db,
        snapshot.docs.map((doc) => doc.ref),
        (batch, ref) => {
          batch.delete(ref);
        },
      );
    } catch (error) {
      console.error(
        "resetSessionRoundExtras trail delete failed",
        sessionId,
        uid,
        error,
      );
    }
  }
}

async function runSafely(label, sessionId, fn) {
  try {
    await fn();
  } catch (error) {
    console.error(`resetSessionRoundExtras ${label} failed`, sessionId, error);
  }
}

/**
 * Clears map/live round extras after a rematch TX.
 * Best-effort per collection — failures are logged and do not abort later work.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function resetSessionRoundExtras(db, sessionId) {
  let memberUids = [];
  try {
    const sessionSnap = await db.collection("sessions").doc(sessionId).get();
    memberUids = Array.isArray(sessionSnap.data()?.memberUids)
      ? sessionSnap.data().memberUids
      : [];
  } catch (error) {
    console.error(
      "resetSessionRoundExtras session read failed",
      sessionId,
      error,
    );
  }

  await runSafely("annotations", sessionId, () =>
    softDeleteActiveAnnotations(db, sessionId),
  );
  await runSafely("pendingQuestions", sessionId, () =>
    cancelOpenPendingQuestions(db, sessionId),
  );
  await runSafely("playerLocations", sessionId, () =>
    deleteCollectionDocs(db, sessionId, "playerLocations"),
  );
  await runSafely("hidingZones", sessionId, () =>
    deleteCollectionDocs(db, sessionId, "hidingZones"),
  );
  await runSafely("timeTraps", sessionId, () =>
    deleteCollectionDocs(db, sessionId, "timeTraps"),
  );
  await runSafely("startingLocations", sessionId, () =>
    deleteCollectionDocs(db, sessionId, "startingLocations"),
  );
  await runSafely("boardEconomy/state", sessionId, () =>
    deleteDocIfExists(db, sessionId, "boardEconomy", "state"),
  );
  await runSafely("endGameTruth/anchors", sessionId, () =>
    deleteDocIfExists(db, sessionId, "endGameTruth", "anchors"),
  );
  await runSafely("playerTrailPoints", sessionId, () =>
    deletePlayerTrailPoints(db, sessionId, memberUids),
  );
}
