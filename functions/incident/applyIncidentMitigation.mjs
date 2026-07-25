import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { INCIDENT_NOT_FOUND } from "./postIncidentMessage.mjs";

export const INCIDENT_MITIGATION_TYPES = new Set([
  "soft_reload",
  "reset_board",
  "clear_pending_questions",
  "end_session",
]);

export const INCIDENT_INVALID_MITIGATION = "INCIDENT_INVALID_MITIGATION";
export const INCIDENT_NO_SESSION = "INCIDENT_NO_SESSION";

const MITIGATION_LABELS = {
  soft_reload: "Requested a soft reload",
  reset_board: "Reset the board",
  clear_pending_questions: "Cleared pending questions",
  end_session: "Ended the session",
};

/** Mitigations that delegate a board/session change to admin moderation. */
const MODERATE_ACTIONS = {
  reset_board: "resetBoard",
  end_session: "end",
};

/**
 * Apply an admin ops mitigation to the incident's session. Writes a bounded,
 * server-only `opsMitigation` override the client honors, optionally delegates
 * to session moderation (reset board / end), appends a system chat line, and
 * records the mitigation on the incident. Admin-only (enforced by the caller).
 *
 * @param db Firestore instance (admin SDK or compatible mock).
 * @param input { incidentId, type, uid, note }
 * @param deps { now, generateId, moderate }
 */
export async function applyIncidentMitigationHandler(db, input, deps = {}) {
  const { incidentId, type, uid } = input;
  if (!INCIDENT_MITIGATION_TYPES.has(type)) {
    throw new Error(INCIDENT_INVALID_MITIGATION);
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
  const sessionId = incident.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error(INCIDENT_NO_SESSION);
  }

  const nowIso = now().toISOString();
  const mitigationId = generateId();
  const note = typeof input.note === "string" ? input.note.trim() : "";

  const moderateAction = MODERATE_ACTIONS[type];
  if (moderateAction && typeof deps.moderate === "function") {
    await deps.moderate(sessionId, moderateAction, uid);
  } else if (
    type === "clear_pending_questions" &&
    typeof deps.clearPendingQuestions === "function"
  ) {
    await deps.clearPendingQuestions(sessionId);
  }

  const opsMitigation = {
    id: mitigationId,
    type,
    appliedAt: nowIso,
    appliedByUid: uid,
    incidentId,
  };
  if (note) {
    opsMitigation.note = note;
  }
  await db
    .collection("sessions")
    .doc(sessionId)
    .update({ opsMitigation });

  await incidentRef.collection("messages").doc(generateId()).set({
    sender: "system",
    kind: "mitigation",
    text: `${MITIGATION_LABELS[type]}${note ? ` — ${note}` : ""}`,
    createdAt: nowIso,
  });

  const incidentUpdate = {
    updatedAt: nowIso,
    mitigations: FieldValue.arrayUnion(opsMitigation),
  };
  // Soft reload is non-destructive: keep the current status.
  if (type !== "soft_reload") {
    incidentUpdate.status = "mitigating";
  }
  await incidentRef.update(incidentUpdate);

  return { mitigationId, type };
}
