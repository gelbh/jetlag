import { randomUUID } from "node:crypto";
import { buildAdminPrompt, INCIDENT_NOTE_MAX_LENGTH } from "./adminPrompt.mjs";

export const CREATE_INCIDENT_ROUTE = "createIncident";
export const INCIDENT_RATE_LIMIT = 3;
export const INCIDENT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
/** Hard cap on serialized diagnostics to reject abusive payloads. */
export const INCIDENT_DIAGNOSTICS_MAX_BYTES = 32 * 1024;

export const INCIDENT_INVALID_DIAGNOSTICS = "INCIDENT_INVALID_DIAGNOSTICS";
export const INCIDENT_PAYLOAD_TOO_LARGE = "INCIDENT_PAYLOAD_TOO_LARGE";
export const INCIDENT_RATE_LIMITED = "INCIDENT_RATE_LIMITED";
export const INCIDENT_UNAUTHENTICATED = "INCIDENT_UNAUTHENTICATED";

function clampNote(note) {
  if (typeof note !== "string") {
    return null;
  }
  const trimmed = note.trim().slice(0, INCIDENT_NOTE_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

function assertValidDiagnostics(diagnostics) {
  if (
    typeof diagnostics !== "object" ||
    diagnostics === null ||
    Array.isArray(diagnostics)
  ) {
    throw new Error(INCIDENT_INVALID_DIAGNOSTICS);
  }
  if (
    typeof diagnostics.appVersion !== "string" ||
    typeof diagnostics.route !== "string"
  ) {
    throw new Error(INCIDENT_INVALID_DIAGNOSTICS);
  }
  const serialized = JSON.stringify(diagnostics);
  if (Buffer.byteLength(serialized, "utf8") > INCIDENT_DIAGNOSTICS_MAX_BYTES) {
    throw new Error(INCIDENT_PAYLOAD_TOO_LARGE);
  }
}

function nullableString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Validate + create an incident: writes `incidents/{id}` and the pinned admin
 * prompt message, then attempts the (best-effort) email hop. Email failures are
 * recorded on the incident but never fail creation. No Cursor / session-ops LLM
 * launch in v1.
 *
 * @param db Firestore instance (admin SDK or a compatible mock).
 * @param input { uid, reporterRole, playerNote, diagnostics }
 * @param deps { rateLimit, sendEmail, now, generateId, incidentUrlBase }
 */
export async function createIncidentHandler(db, input, deps) {
  const { uid } = input;
  if (!uid) {
    throw new Error(INCIDENT_UNAUTHENTICATED);
  }

  const { diagnostics } = input;
  assertValidDiagnostics(diagnostics);

  const rateLimit = deps.rateLimit;
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());
  const incidentUrlBase = (deps.incidentUrlBase ?? "").replace(/\/+$/, "");

  const rl = await rateLimit({
    route: CREATE_INCIDENT_ROUTE,
    uid,
    limit: INCIDENT_RATE_LIMIT,
    windowMs: INCIDENT_RATE_LIMIT_WINDOW_MS,
  });
  if (!rl?.allowed) {
    throw new Error(INCIDENT_RATE_LIMITED);
  }

  const incidentId = generateId();
  const nowIso = now().toISOString();
  const status = "open";
  const playerNote = clampNote(input.playerNote);
  const sessionId = nullableString(diagnostics.sessionId);
  const sessionCode = nullableString(diagnostics.sessionCode);
  const reporterRole = nullableString(input.reporterRole);

  const adminPrompt = buildAdminPrompt({
    incidentId,
    status,
    playerNote,
    diagnostics,
  });

  const incidentRef = db.collection("incidents").doc(incidentId);
  await incidentRef.set({
    status,
    createdAt: nowIso,
    updatedAt: nowIso,
    sessionId,
    sessionCode,
    reporterUid: uid,
    reporterRole,
    playerNote,
    diagnostics,
    adminPrompt,
    email: {},
  });

  await incidentRef.collection("messages").doc(generateId()).set({
    sender: "system",
    kind: "prompt",
    text: adminPrompt,
    createdAt: nowIso,
  });

  const incidentUrl = incidentUrlBase
    ? `${incidentUrlBase}/admin/incidents/${incidentId}`
    : `/admin/incidents/${incidentId}`;

  let email = { error: "not_sent" };
  if (typeof deps.sendEmail === "function") {
    try {
      const subject = `Jet Lag incident ${incidentId}${
        sessionCode ? ` — ${sessionCode}` : ""
      }`;
      const text = `${adminPrompt}\n\nOpen incident: ${incidentUrl}`;
      const result = await deps.sendEmail({ subject, text, incidentUrl });
      email = {
        sentAt: now().toISOString(),
        messageId: result?.messageId ?? null,
      };
    } catch (error) {
      email = {
        error: error instanceof Error ? error.message : "email_failed",
      };
    }
    await incidentRef.update({ email, updatedAt: now().toISOString() });
  }

  return { incidentId, status };
}
