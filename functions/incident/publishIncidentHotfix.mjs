import { randomUUID } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { INCIDENT_NOT_FOUND } from "./postIncidentMessage.mjs";

export const DEFAULT_HOTFIX_GRACE_SECONDS = 30;
export const HOTFIX_PAGE_SIZE = 100;
export const FIRESTORE_BATCH_LIMIT = 500;

export const INCIDENT_INVALID_HOTFIX_VERSION = "INCIDENT_INVALID_HOTFIX_VERSION";
export const INCIDENT_HOTFIX_VERSION_TOO_LOW = "INCIDENT_HOTFIX_VERSION_TOO_LOW";

const FOUR_SEGMENT_VERSION = /^\d+\.\d+\.\d+\.\d+$/;

/**
 * Four-segment-aware compare (missing 4th segment = 0). Same rules as
 * `src/domain/session/meta/sessionVersion.ts`.
 * @returns {-1 | 0 | 1}
 */
export function compareAppVersions(a, b) {
  const parse = (version) => {
    const base = String(version).split("-")[0]?.trim() ?? "";
    const parts = base.split(".").map((part) => {
      const num = Number.parseInt(part, 10);
      return Number.isFinite(num) ? num : 0;
    });
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0];
  };

  const aParts = parse(a);
  const bParts = parse(b);
  for (let i = 0; i < aParts.length; i += 1) {
    if (aParts[i] !== bParts[i]) {
      return aParts[i] < bParts[i] ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Page every active `sessionCodes` doc and collect unique session ids
 * (same listing source as `listActiveSessions`).
 *
 * @param db Firestore instance
 * @param deps {{ pageSize?: number }}
 */
export async function listActiveSessionIds(db, deps = {}) {
  const pageSize = deps.pageSize ?? HOTFIX_PAGE_SIZE;
  const sessionIds = [];
  let pageToken = null;

  for (;;) {
    let codesQuery = db
      .collection("sessionCodes")
      .where("status", "==", "active")
      .orderBy(FieldPath.documentId())
      .limit(pageSize);

    if (pageToken) {
      const cursor = await db.collection("sessionCodes").doc(pageToken).get();
      if (cursor.exists) {
        codesQuery = codesQuery.startAfter(cursor);
      }
    }

    const codesSnap = await codesQuery.get();
    if (codesSnap.empty) {
      break;
    }

    for (const codeDoc of codesSnap.docs) {
      const sessionId = codeDoc.data()?.sessionId;
      if (typeof sessionId === "string" && sessionId.length > 0) {
        sessionIds.push(sessionId);
      }
    }

    if (codesSnap.docs.length < pageSize) {
      break;
    }
    pageToken = codesSnap.docs[codesSnap.docs.length - 1].id;
  }

  return [...new Set(sessionIds)];
}

async function fanOutRequiredMinVersion(
  db,
  sessionIds,
  { toVersion, graceSeconds, nowIso },
) {
  const patch = {
    requiredMinAppVersion: toVersion,
    requiredMinAppVersionSetAt: nowIso,
    requiredMinAppVersionGraceSeconds: graceSeconds,
  };

  for (let index = 0; index < sessionIds.length; index += FIRESTORE_BATCH_LIMIT) {
    const chunk = sessionIds.slice(index, index + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();
    for (const sessionId of chunk) {
      batch.update(db.collection("sessions").doc(sessionId), patch);
    }
    await batch.commit();
  }
}

/**
 * Publish a fourth-segment hotfix gate: write `appConfig/runtime`, fan out
 * `requiredMinAppVersion` to active sessions, append a system chat line, and
 * mark the incident `hotfix_pending`. Admin-only (enforced by the caller).
 *
 * @param db Firestore instance (admin SDK or compatible mock).
 * @param input { incidentId, toVersion, uid, graceSeconds? }
 * @param deps { now, generateId, listActiveSessionIds }
 */
export async function publishIncidentHotfixHandler(db, input, deps = {}) {
  const { incidentId, uid } = input;
  if (typeof incidentId !== "string" || incidentId.length === 0) {
    throw new Error(INCIDENT_NOT_FOUND);
  }

  const toVersion =
    typeof input.toVersion === "string" ? input.toVersion.trim() : "";
  if (!FOUR_SEGMENT_VERSION.test(toVersion)) {
    throw new Error(INCIDENT_INVALID_HOTFIX_VERSION);
  }

  const graceRaw = Number(input.graceSeconds);
  const graceSeconds =
    Number.isFinite(graceRaw) && graceRaw >= 0
      ? Math.trunc(graceRaw)
      : DEFAULT_HOTFIX_GRACE_SECONDS;

  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());
  const listIds = deps.listActiveSessionIds ?? listActiveSessionIds;

  const incidentRef = db.collection("incidents").doc(incidentId);
  const snapshot = await incidentRef.get();
  if (!snapshot.exists) {
    throw new Error(INCIDENT_NOT_FOUND);
  }

  const incident = snapshot.data() ?? {};
  const fromVersion =
    typeof incident.diagnostics?.appVersion === "string" &&
    incident.diagnostics.appVersion.length > 0
      ? incident.diagnostics.appVersion
      : "0.0.0.0";

  if (compareAppVersions(toVersion, fromVersion) < 0) {
    throw new Error(INCIDENT_HOTFIX_VERSION_TOO_LOW);
  }

  const nowIso = now().toISOString();
  const hotfix = {
    fromVersion,
    toVersion,
    graceSeconds,
    publishedAt: nowIso,
  };

  await db
    .collection("appConfig")
    .doc("runtime")
    .set(
      {
        requiredMinAppVersion: toVersion,
        hotfixGraceSeconds: graceSeconds,
        updatedAt: nowIso,
        updatedByUid: uid,
        incidentId,
      },
      { merge: true },
    );

  const sessionIds = await listIds(db);
  await fanOutRequiredMinVersion(db, sessionIds, {
    toVersion,
    graceSeconds,
    nowIso,
  });

  await incidentRef.collection("messages").doc(generateId()).set({
    sender: "system",
    kind: "hotfix",
    text: `Published hotfix ${toVersion} (grace ${graceSeconds}s)`,
    createdAt: nowIso,
  });

  await incidentRef.update({
    status: "hotfix_pending",
    updatedAt: nowIso,
    hotfix,
  });

  return {
    toVersion,
    graceSeconds,
    fannedOutSessionCount: sessionIds.length,
  };
}
