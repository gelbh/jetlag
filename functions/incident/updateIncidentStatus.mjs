import { randomUUID } from "node:crypto";
import { INCIDENT_NOT_FOUND } from "./postIncidentMessage.mjs";

export const INCIDENT_STATUS_TARGETS = new Set([
  "resolved",
  "dismissed",
  "chatting",
]);

export const INCIDENT_INVALID_STATUS = "INCIDENT_INVALID_STATUS";
export const INCIDENT_INVALID_TRANSITION = "INCIDENT_INVALID_TRANSITION";

const CLOSE_FROM = new Set([
  "open",
  "chatting",
  "mitigating",
  "hotfix_pending",
]);

const REOPEN_FROM = new Set(["resolved", "dismissed"]);

const STATUS_LABELS = {
  resolved: "Incident marked resolved",
  dismissed: "Incident dismissed",
  chatting: "Incident reopened",
};

/**
 * Admin-only incident status transitions for resolve / dismiss / reopen.
 *
 * @param db Firestore admin instance or compatible mock
 * @param input { incidentId, status, uid }
 * @param deps { now, generateId }
 */
export async function updateIncidentStatusHandler(db, input, deps = {}) {
  const { incidentId, status, uid } = input;
  if (!INCIDENT_STATUS_TARGETS.has(status)) {
    throw new Error(INCIDENT_INVALID_STATUS);
  }
  if (typeof incidentId !== "string" || incidentId.length === 0) {
    throw new Error(INCIDENT_NOT_FOUND);
  }

  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());
  const incidentRef = db.collection("incidents").doc(incidentId);
  const snapshot = await incidentRef.get();
  if (!snapshot.exists) {
    throw new Error(INCIDENT_NOT_FOUND);
  }

  const incident = snapshot.data() ?? {};
  const current = incident.status;
  if (status === "chatting") {
    if (!REOPEN_FROM.has(current)) {
      throw new Error(INCIDENT_INVALID_TRANSITION);
    }
  } else if (!CLOSE_FROM.has(current)) {
    throw new Error(INCIDENT_INVALID_TRANSITION);
  }

  const nowIso = now().toISOString();
  await incidentRef.collection("messages").doc(generateId()).set({
    sender: "system",
    kind: "chat",
    text: STATUS_LABELS[status],
    createdAt: nowIso,
    createdByUid: uid,
  });

  await incidentRef.update({
    status,
    updatedAt: nowIso,
  });

  return { status };
}
