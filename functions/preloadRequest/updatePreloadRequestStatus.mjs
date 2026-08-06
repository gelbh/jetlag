export const UPDATE_PRELOAD_REQUEST_STATUS_ROUTE = "updatePreloadRequestStatus";

export const PRELOAD_STATUS_TARGETS = new Set([
  "accepted",
  "declined",
  "shipped",
  "open",
]);

export const PRELOAD_REQUEST_NOT_FOUND = "PRELOAD_REQUEST_NOT_FOUND";
export const PRELOAD_INVALID_STATUS = "PRELOAD_INVALID_STATUS";
export const PRELOAD_INVALID_TRANSITION = "PRELOAD_INVALID_TRANSITION";

/** Allowed admin status edges for v1 inbox. */
const ALLOWED = {
  open: new Set(["accepted", "declined", "shipped"]),
  accepted: new Set(["shipped", "declined", "open"]),
  declined: new Set(["open", "accepted"]),
  shipped: new Set(["open"]),
};

/**
 * Admin-only preload request status transitions.
 *
 * @param db Firestore admin instance or compatible mock
 * @param input { requestId, status, uid }
 * @param deps { now }
 */
export async function updatePreloadRequestStatusHandler(db, input, deps = {}) {
  const { requestId, status } = input;
  if (!PRELOAD_STATUS_TARGETS.has(status)) {
    throw new Error(PRELOAD_INVALID_STATUS);
  }
  if (
    typeof requestId !== "string" ||
    requestId.length === 0 ||
    requestId.includes("/")
  ) {
    throw new Error(PRELOAD_REQUEST_NOT_FOUND);
  }

  const now = deps.now ?? (() => new Date());
  const requestRef = db.collection("preloadRequests").doc(requestId);
  const nowIso = now().toISOString();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    if (!snapshot.exists) {
      throw new Error(PRELOAD_REQUEST_NOT_FOUND);
    }

    const current = snapshot.data()?.status;
    const allowed = ALLOWED[current];
    if (!allowed || !allowed.has(status)) {
      throw new Error(PRELOAD_INVALID_TRANSITION);
    }

    transaction.update(requestRef, {
      status,
      updatedAt: nowIso,
    });
  });

  return { status };
}
