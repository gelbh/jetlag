import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { requireAdminAuth } from "./adminAccess.mjs";

const sentryDsnSecret = getSentryDsnSecret();
const FIRESTORE_BATCH_LIMIT = 500;

const VALID_ACTIONS = new Set(["end", "resetBoard", "cleanupCode"]);

async function softDeleteActiveAnnotations(db, sessionId, resetAt) {
  const annotationsRef = db
    .collection("sessions")
    .doc(sessionId)
    .collection("annotations");

  const snapshot = await annotationsRef.where("status", "==", "active").get();
  if (snapshot.empty) {
    return;
  }

  for (let index = 0; index < snapshot.docs.length; index += FIRESTORE_BATCH_LIMIT) {
    const chunk = snapshot.docs.slice(index, index + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();

    for (const annotationDoc of chunk) {
      batch.update(annotationDoc.ref, {
        status: "deleted",
        updatedAt: resetAt,
      });
    }

    await batch.commit();
  }
}

async function cancelOpenPendingQuestions(db, sessionId) {
  const questionsRef = db
    .collection("sessions")
    .doc(sessionId)
    .collection("pendingQuestions");

  const snapshot = await questionsRef.where("status", "==", "open").get();
  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();
  for (const questionDoc of snapshot.docs) {
    batch.update(questionDoc.ref, { status: "cancelled" });
  }
  await batch.commit();
}

async function moderateSession(db, sessionId, action, adminUid) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError("not-found", "Session not found.");
  }

  const session = sessionSnap.data() ?? {};
  const now = new Date().toISOString();

  if (action === "end") {
    await sessionRef.update({
      endGameStartedAt: now,
      endGameStartedByUid: adminUid,
      endGameRequestedAt: FieldValue.delete(),
      endGameRequestedByUid: FieldValue.delete(),
    });
    return;
  }

  if (action === "resetBoard") {
    await softDeleteActiveAnnotations(db, sessionId, now);
    await cancelOpenPendingQuestions(db, sessionId);
    await sessionRef.update({
      sessionResetAt: now,
      timerAccumulatedMs: 0,
      timerRunningSince: FieldValue.delete(),
      endGameStartedAt: FieldValue.delete(),
      endGameStartedByUid: FieldValue.delete(),
      endGameRequestedAt: FieldValue.delete(),
      endGameRequestedByUid: FieldValue.delete(),
    });
    return;
  }

  if (action === "cleanupCode") {
    const code = typeof session.code === "string" ? session.code : null;
    await sessionRef.update({
      endedAt: now,
      status: "ended",
      code: FieldValue.delete(),
    });

    if (code) {
      await db.collection("sessionCodes").doc(code).set(
        { status: "ended" },
        { merge: true },
      );
    }
  }
}

export const adminModerateSession = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    requireAdminAuth(request.auth);

    const sessionId =
      typeof request.data?.sessionId === "string" ? request.data.sessionId : "";
    const action =
      typeof request.data?.action === "string" ? request.data.action : "";

    if (!sessionId) {
      throw new HttpsError("invalid-argument", "sessionId is required.");
    }

    if (!VALID_ACTIONS.has(action)) {
      throw new HttpsError("invalid-argument", "Invalid moderation action.");
    }

    const db = getFirestore();
    await moderateSession(db, sessionId, action, request.auth.uid);
    return { ok: true };
  }),
);

export { moderateSession, softDeleteActiveAnnotations };
