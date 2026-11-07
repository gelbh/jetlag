import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { enforceAppCheck } from "../lib/appCheck.mjs";
import { posthogProjectApiKey, withFunctionsExceptionHandler } from "../lib/functionsException.mjs";
import { haversineMeters } from "../session/castleSiege/haversine.mjs";
import { requireAdminAuth } from "./adminAccess.mjs";

const VALID_ACTIONS = new Set([
  "listAnnotations",
  "softDeleteAnnotation",
  "restoreAnnotation",
  "recomputeThermometerFromHide",
]);

/**
 * Pure: hotter/colder from hide vs thermometer A→B.
 * Matches client `truthThermometer` / `applyBoardOpPreview` comparison
 * (`distanceToB + 1e-6 < distanceToA ? hotter : colder`); no near-edge bailout.
 */
export function computeThermometerAnswerFromHide(pointA, pointB, hide) {
  const distanceToA = haversineMeters(hide.lat, hide.lng, pointA.lat, pointA.lng);
  const distanceToB = haversineMeters(hide.lat, hide.lng, pointB.lat, pointB.lng);
  const answer = distanceToB + 1e-6 < distanceToA ? "hotter" : "colder";
  const hotterTowards = answer === "hotter" ? "b" : "a";
  return { answer, hotterTowards, distanceToA, distanceToB };
}

export function parseThermometerEndpoints(geometryJson) {
  let parsed;
  try {
    parsed = JSON.parse(geometryJson);
  } catch {
    return null;
  }
  const geometry = parsed?.geometry ?? parsed;
  if (geometry?.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    return null;
  }
  const coordinates = geometry.coordinates;
  if (coordinates.length < 2) {
    return null;
  }
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  if (
    !Array.isArray(start) ||
    !Array.isArray(end) ||
    start.length < 2 ||
    end.length < 2 ||
    !Number.isFinite(start[0]) ||
    !Number.isFinite(start[1]) ||
    !Number.isFinite(end[0]) ||
    !Number.isFinite(end[1])
  ) {
    return null;
  }
  return {
    pointA: { lng: start[0], lat: start[1] },
    pointB: { lng: end[0], lat: end[1] },
  };
}

export function summarizeAnnotation(docId, data) {
  const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
  let answerSummary = null;
  if (data.type === "thermometer") {
    answerSummary =
      typeof metadata.thermometerAnswer === "string" ? metadata.thermometerAnswer : null;
  } else if (data.type === "radar") {
    if (metadata.inside === true) answerSummary = "inside";
    else if (metadata.inside === false) answerSummary = "outside";
  } else if (typeof data.answer === "string") {
    answerSummary = data.answer;
  }
  return {
    id: docId,
    type: typeof data.type === "string" ? data.type : "unknown",
    status: typeof data.status === "string" ? data.status : "unknown",
    createdAt: typeof metadata.createdAt === "string" ? metadata.createdAt : null,
    answerSummary,
    hotterTowards: typeof metadata.hotterTowards === "string" ? metadata.hotterTowards : null,
    radiusMeters: typeof metadata.radiusMeters === "number" ? metadata.radiusMeters : null,
  };
}

async function requireSession(db, sessionId) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError("not-found", "Session not found.");
  }
  return sessionRef;
}

async function listAnnotations(db, sessionId) {
  const snapshot = await db.collection("sessions").doc(sessionId).collection("annotations").get();
  const annotations = snapshot.docs.map((doc) => summarizeAnnotation(doc.id, doc.data() ?? {}));
  annotations.sort((left, right) => {
    const leftAt = left.createdAt ?? "";
    const rightAt = right.createdAt ?? "";
    return leftAt.localeCompare(rightAt);
  });
  return { annotations };
}

async function softDeleteAnnotation(db, sessionId, annotationId, adminUid) {
  const ref = db.collection("sessions").doc(sessionId).collection("annotations").doc(annotationId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Annotation not found.");
  }
  const data = snap.data() ?? {};
  if (data.status === "deleted") {
    throw new HttpsError("failed-precondition", "Annotation is already deleted.");
  }
  const now = new Date().toISOString();
  const metadata = {
    ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
    opsDeletedAt: now,
    opsDeletedByUid: adminUid,
  };
  await ref.update({ status: "deleted", updatedAt: now, metadata });
  return { ok: true, annotationId, status: "deleted" };
}

async function restoreAnnotation(db, sessionId, annotationId, adminUid) {
  const ref = db.collection("sessions").doc(sessionId).collection("annotations").doc(annotationId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Annotation not found.");
  }
  const data = snap.data() ?? {};
  if (data.status === "active") {
    throw new HttpsError("failed-precondition", "Annotation is already active.");
  }
  const now = new Date().toISOString();
  const metadata = {
    ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
    opsRestoredAt: now,
    opsRestoredByUid: adminUid,
  };
  await ref.update({ status: "active", updatedAt: now, metadata });
  return { ok: true, annotationId, status: "active" };
}

async function loadConfirmedHideCenter(db, sessionId) {
  const snapshot = await db.collection("sessions").doc(sessionId).collection("hidingZones").get();
  for (const doc of snapshot.docs) {
    const data = doc.data() ?? {};
    if (data.status !== "confirmed") continue;
    const center = data.center;
    if (
      center &&
      typeof center.lat === "number" &&
      typeof center.lng === "number" &&
      Number.isFinite(center.lat) &&
      Number.isFinite(center.lng)
    ) {
      return { lat: center.lat, lng: center.lng };
    }
  }
  return null;
}

async function recomputeThermometerFromHide(db, sessionId, annotationId, adminUid) {
  const ref = db.collection("sessions").doc(sessionId).collection("annotations").doc(annotationId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Annotation not found.");
  }
  const data = snap.data() ?? {};
  if (data.type !== "thermometer") {
    throw new HttpsError("failed-precondition", "Annotation is not a thermometer.");
  }
  const endpoints = parseThermometerEndpoints(
    typeof data.geometryJson === "string" ? data.geometryJson : "",
  );
  if (!endpoints) {
    throw new HttpsError("failed-precondition", "Thermometer geometry is invalid.");
  }
  const hide = await loadConfirmedHideCenter(db, sessionId);
  if (!hide) {
    throw new HttpsError("failed-precondition", "No confirmed hiding zone center.");
  }
  const { answer, hotterTowards } = computeThermometerAnswerFromHide(
    endpoints.pointA,
    endpoints.pointB,
    hide,
  );
  const now = new Date().toISOString();
  const metadata = {
    ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}),
    thermometerAnswer: answer,
    hotterTowards,
    opsRecomputedAt: now,
    opsRecomputedByUid: adminUid,
  };
  await ref.update({
    status: "active",
    updatedAt: now,
    metadata,
  });
  return {
    ok: true,
    annotationId,
    status: "active",
    thermometerAnswer: answer,
    hotterTowards,
  };
}

export async function runSessionBoardOps(db, sessionId, action, annotationId, adminUid) {
  await requireSession(db, sessionId);

  if (action === "listAnnotations") {
    return listAnnotations(db, sessionId);
  }

  if (!annotationId) {
    throw new HttpsError("invalid-argument", "annotationId is required.");
  }

  if (action === "softDeleteAnnotation") {
    return softDeleteAnnotation(db, sessionId, annotationId, adminUid);
  }
  if (action === "restoreAnnotation") {
    return restoreAnnotation(db, sessionId, annotationId, adminUid);
  }
  if (action === "recomputeThermometerFromHide") {
    return recomputeThermometerFromHide(db, sessionId, annotationId, adminUid);
  }

  throw new HttpsError("invalid-argument", "Invalid board ops action.");
}

export const adminSessionBoardOps = onCall(
  { secrets: [posthogProjectApiKey], enforceAppCheck },
  withFunctionsExceptionHandler(async (request) => {
    requireAdminAuth(request.auth);

    const sessionId = typeof request.data?.sessionId === "string" ? request.data.sessionId : "";
    const action = typeof request.data?.action === "string" ? request.data.action : "";
    const annotationId =
      typeof request.data?.annotationId === "string" ? request.data.annotationId : "";

    if (!sessionId) {
      throw new HttpsError("invalid-argument", "sessionId is required.");
    }
    if (!VALID_ACTIONS.has(action)) {
      throw new HttpsError("invalid-argument", "Invalid board ops action.");
    }

    const db = getFirestore();
    return runSessionBoardOps(db, sessionId, action, annotationId, request.auth.uid);
  }),
);
