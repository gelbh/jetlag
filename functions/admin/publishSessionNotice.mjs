import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { enforceAppCheck } from "../lib/appCheck.mjs";
import { posthogProjectApiKey, withFunctionsExceptionHandler } from "../lib/functionsException.mjs";
import { requireAdminAuth } from "./adminAccess.mjs";

// Mirror of src/domain/session/opsNotice.ts (no shared TS/mjs module yet).
export const SESSION_NOTICE_TEXT_MAX = 280;
export const SESSION_NOTICE_TTL_MIN = 10;
export const SESSION_NOTICE_TTL_MAX = 120;
export const SESSION_NOTICE_TTL_DEFAULT = 30;

const VALID_TONES = new Set(["info", "warn"]);

export function clampNoticeTtlSeconds(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return SESSION_NOTICE_TTL_DEFAULT;
  }
  const rounded = Math.round(value);
  return Math.min(SESSION_NOTICE_TTL_MAX, Math.max(SESSION_NOTICE_TTL_MIN, rounded));
}

export function normalizeNoticeText(text) {
  if (typeof text !== "string") {
    return null;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > SESSION_NOTICE_TEXT_MAX) {
    return null;
  }
  return trimmed;
}

export function normalizeNoticeTone(tone) {
  if (tone == null || tone === "") {
    return "info";
  }
  if (typeof tone !== "string" || !VALID_TONES.has(tone)) {
    return null;
  }
  return tone;
}

export function buildNoticeDocument({
  text,
  tone,
  ttlSeconds,
  createdByUid,
  createdAt = new Date().toISOString(),
  supersedesNoticeId = null,
}) {
  const expiresAt = new Date(Date.parse(createdAt) + ttlSeconds * 1000).toISOString();
  return {
    text,
    tone,
    createdAt,
    createdByUid,
    expiresAt,
    active: true,
    dismissedBy: {},
    ...(supersedesNoticeId ? { supersedesNoticeId } : {}),
  };
}

export async function publishSessionNotice(db, sessionId, input, adminUid) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError("not-found", "Session not found.");
  }

  const text = normalizeNoticeText(input.text);
  if (!text) {
    throw new HttpsError(
      "invalid-argument",
      `text is required (1–${SESSION_NOTICE_TEXT_MAX} characters).`,
    );
  }

  const tone = normalizeNoticeTone(input.tone);
  if (!tone) {
    throw new HttpsError("invalid-argument", "tone must be info or warn.");
  }

  const ttlSeconds = clampNoticeTtlSeconds(input.ttlSeconds);
  const noticesRef = sessionRef.collection("notices");
  const noticeRef = noticesRef.doc();
  const createdAt = new Date().toISOString();

  // Transaction so concurrent publishes cannot leave two active notices.
  const result = await db.runTransaction(async (tx) => {
    const activeSnap = await tx.get(noticesRef.where("active", "==", true));
    const supersedesNoticeId = activeSnap.docs[0]?.id ?? null;
    const notice = buildNoticeDocument({
      text,
      tone,
      ttlSeconds,
      createdByUid: adminUid,
      createdAt,
      supersedesNoticeId,
    });
    for (const doc of activeSnap.docs) {
      tx.update(doc.ref, { active: false });
    }
    tx.set(noticeRef, notice);
    return {
      ok: true,
      noticeId: noticeRef.id,
      expiresAt: notice.expiresAt,
      ttlSeconds,
      supersededCount: activeSnap.size,
    };
  });

  return result;
}

export const adminPublishSessionNotice = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck },
  withFunctionsExceptionHandler(async (request) => {
    requireAdminAuth(request.auth);

    const sessionId = typeof request.data?.sessionId === "string" ? request.data.sessionId : "";
    if (!sessionId) {
      throw new HttpsError("invalid-argument", "sessionId is required.");
    }

    const db = getFirestore();
    return publishSessionNotice(
      db,
      sessionId,
      {
        text: request.data?.text,
        tone: request.data?.tone,
        ttlSeconds: request.data?.ttlSeconds,
      },
      request.auth.uid,
    );
  }),
);
