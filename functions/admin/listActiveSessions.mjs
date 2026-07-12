import { FieldPath, getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { getSentryDsnSecret, withSentryEventHandler } from "../lib/sentry.mjs";
import { requireAdminAuth } from "./adminAccess.mjs";

const sentryDsnSecret = getSentryDsnSecret();
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;
const SUMMARY_CONCURRENCY = 5;

const SESSION_DOC_ACTIVITY_FIELDS = [
  "createdAt",
  "timerRunningSince",
  "endGameRequestedAt",
  "endGameStartedAt",
  "sessionResetAt",
];

export function parseFirestoreTimestampMs(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }

  if (typeof value === "object") {
    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }

    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
    if (typeof seconds === "number") {
      return seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
    }
  }

  return null;
}

export function resolveSessionDocActivityMs(session) {
  let maxMs = null;

  for (const field of SESSION_DOC_ACTIVITY_FIELDS) {
    const ms = parseFirestoreTimestampMs(session[field]);
    if (ms != null && (maxMs == null || ms > maxMs)) {
      maxMs = ms;
    }
  }

  return maxMs;
}

export function resolveLatestSubcollectionActivityMs(
  annotationDoc,
  messageDoc,
  questionDoc,
) {
  const candidates = [
    parseFirestoreTimestampMs(annotationDoc?.updatedAt),
    parseFirestoreTimestampMs(messageDoc?.createdAt),
    parseFirestoreTimestampMs(questionDoc?.createdAt),
  ].filter((ms) => ms != null);

  if (candidates.length === 0) {
    return null;
  }

  return Math.max(...candidates);
}

export function resolveSessionLastActivityMs(session, latestEvents = {}) {
  const {
    annotationDoc = null,
    messageDoc = null,
    questionDoc = null,
  } = latestEvents;
  const candidates = [
    resolveSessionDocActivityMs(session),
    resolveLatestSubcollectionActivityMs(annotationDoc, messageDoc, questionDoc),
  ].filter((ms) => ms != null);

  if (candidates.length === 0) {
    return null;
  }

  return Math.max(...candidates);
}

export function compareSessionsByLastActivity(left, right) {
  const leftActivity = left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0;
  const rightActivity = right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0;
  if (rightActivity !== leftActivity) {
    return rightActivity - leftActivity;
  }

  const leftCreated = left.createdAt ? Date.parse(left.createdAt) : 0;
  const rightCreated = right.createdAt ? Date.parse(right.createdAt) : 0;
  return rightCreated - leftCreated;
}

function countRoles(memberRoles) {
  const counts = { seeker: 0, hider: 0, observer: 0 };
  if (!memberRoles || typeof memberRoles !== "object") {
    return counts;
  }

  for (const role of Object.values(memberRoles)) {
    if (role === "seeker") {
      counts.seeker += 1;
    } else if (role === "hider") {
      counts.hider += 1;
    } else if (role === "observer") {
      counts.observer += 1;
    }
  }

  return counts;
}

function resolveHidingPeriodMs(session) {
  if (typeof session.hidingPeriodMinutes === "number") {
    return session.hidingPeriodMinutes * 60_000;
  }

  const gameSize = session.gameSize;
  if (gameSize === "small") {
    return 30 * 60_000;
  }
  if (gameSize === "large") {
    return 180 * 60_000;
  }

  return 60 * 60_000;
}

function timerElapsedMs(session, nowMs = Date.now()) {
  const accumulated =
    typeof session.timerAccumulatedMs === "number"
      ? session.timerAccumulatedMs
      : 0;
  const runningSince = session.timerRunningSince;
  if (typeof runningSince !== "string") {
    return accumulated;
  }

  const startedMs = Date.parse(runningSince);
  if (Number.isNaN(startedMs)) {
    return accumulated;
  }

  return accumulated + Math.max(0, nowMs - startedMs);
}

export function deriveSessionPhase(session, nowMs = Date.now()) {
  if (typeof session.endGameStartedAt === "string") {
    return "end-game-active";
  }

  if (typeof session.endGameRequestedAt === "string") {
    return "end-game-pending";
  }

  const elapsed = timerElapsedMs(session, nowMs);
  if (elapsed <= 0) {
    return "waiting";
  }

  const hidingPeriodMs = resolveHidingPeriodMs(session);
  if (elapsed < hidingPeriodMs) {
    return "hiding";
  }

  return "seek";
}

export function summarizeSession(sessionId, code, session, nowMs = Date.now()) {
  const memberUids = Array.isArray(session.memberUids)
    ? session.memberUids.filter((uid) => typeof uid === "string")
    : [];
  const roleCounts = countRoles(session.memberRoles);

  return {
    sessionId,
    code,
    hostUid: typeof session.hostUid === "string" ? session.hostUid : null,
    tier: session.tier === "premium" ? "premium" : "free",
    gameSize:
      session.gameSize === "small" ||
      session.gameSize === "medium" ||
      session.gameSize === "large"
        ? session.gameSize
        : "medium",
    createdAt:
      typeof session.createdAt === "string" ? session.createdAt : null,
    memberCount: memberUids.length,
    roleCounts,
    timerAccumulatedMs:
      typeof session.timerAccumulatedMs === "number"
        ? session.timerAccumulatedMs
        : 0,
    timerRunningSince:
      typeof session.timerRunningSince === "string"
        ? session.timerRunningSince
        : null,
    endGameStartedAt:
      typeof session.endGameStartedAt === "string"
        ? session.endGameStartedAt
        : null,
    endGameRequestedAt:
      typeof session.endGameRequestedAt === "string"
        ? session.endGameRequestedAt
        : null,
    hostAppVersion:
      typeof session.hostAppVersion === "string"
        ? session.hostAppVersion
        : null,
    hidingPeriodMinutes:
      typeof session.hidingPeriodMinutes === "number"
        ? session.hidingPeriodMinutes
        : null,
    regionPackId:
      typeof session.regionPackId === "string" ? session.regionPackId : null,
    regionPackSubregionId:
      typeof session.regionPackSubregionId === "string"
        ? session.regionPackSubregionId
        : null,
    transitMetroId:
      typeof session.transitMetroId === "string" ? session.transitMetroId : null,
    gameAreaLabel:
      typeof session.gameAreaLabel === "string" ? session.gameAreaLabel : null,
    phase: deriveSessionPhase(session, nowMs),
    lastActivityAt: null,
  };
}

export async function mapActiveCodeToSummary(codeDoc, db, nowMs = Date.now()) {
  const code = codeDoc.id;
  const codeData = codeDoc.data();
  const sessionId =
    typeof codeData.sessionId === "string" ? codeData.sessionId : null;
  if (!sessionId) {
    return null;
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    return null;
  }

  const session = sessionSnap.data();
  if (session.status === "ended" || typeof session.endedAt === "string") {
    return null;
  }

  const [annotationsSnap, messagesSnap, questionsSnap] = await Promise.all([
    sessionRef
      .collection("annotations")
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get(),
    sessionRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get(),
    sessionRef
      .collection("pendingQuestions")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get(),
  ]);

  const lastActivityMs = resolveSessionLastActivityMs(session, {
    annotationDoc: annotationsSnap.docs[0]?.data() ?? null,
    messageDoc: messagesSnap.docs[0]?.data() ?? null,
    questionDoc: questionsSnap.docs[0]?.data() ?? null,
  });

  const summary = summarizeSession(sessionId, code, session, nowMs);
  summary.lastActivityAt =
    lastActivityMs == null ? null : new Date(lastActivityMs).toISOString();
  return summary;
}

export async function mapWithConcurrency(items, concurrency, mapper) {
  const results = [];

  for (let index = 0; index < items.length; index += concurrency) {
    const chunk = items.slice(index, index + concurrency);
    const chunkResults = await Promise.all(chunk.map(mapper));
    results.push(...chunkResults);
  }

  return results;
}

export const listActiveSessions = onCall(
  { secrets: [sentryDsnSecret], enforceAppCheck: true },
  withSentryEventHandler(async (request) => {
    requireAdminAuth(request.auth);

    const db = getFirestore();
    const requestedLimit = Number(request.data?.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PAGE_LIMIT)
      : DEFAULT_PAGE_LIMIT;
    const pageToken =
      typeof request.data?.pageToken === "string" ? request.data.pageToken : null;

    let codesQuery = db
      .collection("sessionCodes")
      .where("status", "==", "active")
      .orderBy(FieldPath.documentId())
      .limit(limit);

    if (pageToken) {
      const cursor = await db.collection("sessionCodes").doc(pageToken).get();
      if (cursor.exists) {
        codesQuery = codesQuery.startAfter(cursor);
      }
    }

    const codesSnap = await codesQuery.get();
    const nowMs = Date.now();
    const sessions = (
      await mapWithConcurrency(
        codesSnap.docs,
        SUMMARY_CONCURRENCY,
        (codeDoc) => mapActiveCodeToSummary(codeDoc, db, nowMs),
      )
    ).filter((summary) => summary != null);

    sessions.sort(compareSessionsByLastActivity);

    const nextPageToken =
      codesSnap.size === limit
        ? codesSnap.docs[codesSnap.docs.length - 1]?.id ?? null
        : null;

    return { sessions, nextPageToken };
  }),
);
