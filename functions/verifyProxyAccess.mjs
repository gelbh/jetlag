function readBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function readSessionId(req) {
  const sessionId = req.headers["x-session-id"];
  return typeof sessionId === "string" && sessionId.length > 0
    ? sessionId
    : null;
}

export function hasPremiumAccessClaim(decodedToken) {
  return decodedToken.access === true;
}

export function isPremiumSessionMember(sessionData, uid) {
  return (
    sessionData?.tier === "premium" &&
    Array.isArray(sessionData.memberUids) &&
    sessionData.memberUids.includes(uid)
  );
}

export function isSessionMember(sessionData, uid) {
  return (
    Array.isArray(sessionData?.memberUids) && sessionData.memberUids.includes(uid)
  );
}

/**
 * @param {import("firebase-admin/auth").Auth} auth
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {import("firebase-functions/v2/https").Request} req
 */
export async function verifyProxyAccess(auth, db, req) {
  const token = readBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: "Missing authorization." };
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return { ok: false, status: 401, error: "Invalid authorization." };
  }

  const sessionId = readSessionId(req);
  if (sessionId) {
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return { ok: false, status: 403, error: "Session not found." };
    }

    if (!isPremiumSessionMember(sessionDoc.data(), decoded.uid)) {
      return { ok: false, status: 403, error: "Premium session required." };
    }

    return { ok: true, uid: decoded.uid, sessionId };
  }

  if (hasPremiumAccessClaim(decoded)) {
    return { ok: true, uid: decoded.uid, sessionId: null };
  }

  return { ok: false, status: 403, error: "Premium session required." };
}

/**
 * Overpass proxy: any signed-in user, or a member of the session in X-Session-Id.
 * @param {import("firebase-admin/auth").Auth} auth
 * @param {import("firebase-admin/firestore").Firestore} db
 * @param {import("firebase-functions/v2/https").Request} req
 */
export async function verifyOverpassProxyAccess(auth, db, req) {
  const token = readBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: "Missing authorization." };
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return { ok: false, status: 401, error: "Invalid authorization." };
  }

  const sessionId = readSessionId(req);
  if (!sessionId) {
    return { ok: false, status: 403, error: "Session membership required." };
  }

  const sessionDoc = await db.collection("sessions").doc(sessionId).get();
  if (!sessionDoc.exists) {
    return { ok: false, status: 403, error: "Session not found." };
  }

  if (!isSessionMember(sessionDoc.data(), decoded.uid)) {
    return { ok: false, status: 403, error: "Session membership required." };
  }

  return { ok: true, uid: decoded.uid, sessionId };
}

export function sendProxyAuthFailure(res, result) {
  res.status(result.status).json({ error: result.error });
}
