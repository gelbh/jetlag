import { randomUUID } from "node:crypto";

export const INCIDENT_MESSAGE_MAX_LENGTH = 2000;

export const INCIDENT_NOT_FOUND = "INCIDENT_NOT_FOUND";
export const INCIDENT_FORBIDDEN = "INCIDENT_FORBIDDEN";
export const INCIDENT_INVALID_MESSAGE = "INCIDENT_INVALID_MESSAGE";

/**
 * Append a human chat message to an incident. Reporter (own incident) or admin
 * only; advances `open` → `chatting`.
 *
 * @param db Firestore instance (admin SDK or compatible mock).
 * @param input { incidentId, uid, isAdmin, text }
 * @param deps { now, generateId }
 */
export async function postIncidentMessageHandler(db, input, deps = {}) {
  const { incidentId, uid, isAdmin } = input;
  if (!uid) {
    throw new Error(INCIDENT_FORBIDDEN);
  }
  if (typeof incidentId !== "string" || incidentId.length === 0) {
    throw new Error(INCIDENT_NOT_FOUND);
  }

  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (text.length === 0 || text.length > INCIDENT_MESSAGE_MAX_LENGTH) {
    throw new Error(INCIDENT_INVALID_MESSAGE);
  }

  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());

  const incidentRef = db.collection("incidents").doc(incidentId);
  const snapshot = await incidentRef.get();
  if (!snapshot.exists) {
    throw new Error(INCIDENT_NOT_FOUND);
  }

  const incident = snapshot.data() ?? {};
  if (!isAdmin && incident.reporterUid !== uid) {
    throw new Error(INCIDENT_FORBIDDEN);
  }

  const nowIso = now().toISOString();
  const messageId = generateId();
  await incidentRef.collection("messages").doc(messageId).set({
    sender: isAdmin ? "admin" : "player",
    senderUid: uid,
    kind: "chat",
    text,
    createdAt: nowIso,
  });

  const update = { updatedAt: nowIso };
  if (incident.status === "open") {
    update.status = "chatting";
  }
  await incidentRef.update(update);

  return { messageId };
}
