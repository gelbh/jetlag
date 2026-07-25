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

/** Client-visible email failure code (details stay server-side in logs). */
export const INCIDENT_EMAIL_FAILED_CODE = "email_failed";

/** Top-level IncidentDiagnostics keys allowed into Firestore. */
const DIAGNOSTICS_ALLOWED_KEYS = [
  "appVersion",
  "route",
  "sessionId",
  "sessionCode",
  "playerRole",
  "uid",
  "userAgent",
  "platform",
  "online",
  "visibilityState",
  "lastClientErrors",
  "recentOps",
  "mapViewport",
  "reportedAt",
];

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

/** Strip unknown top-level diagnostics keys before persistence. */
function sanitizeDiagnostics(diagnostics) {
  const out = {};
  for (const key of DIAGNOSTICS_ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(diagnostics, key)) {
      out[key] = diagnostics[key];
    }
  }
  return out;
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
  const safeDiagnostics = sanitizeDiagnostics(diagnostics);

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
  const sessionId = nullableString(safeDiagnostics.sessionId);
  const sessionCode = nullableString(safeDiagnostics.sessionCode);
  const reporterRole = nullableString(input.reporterRole);

  const adminPrompt = buildAdminPrompt({
    incidentId,
    status,
    playerNote,
    diagnostics: safeDiagnostics,
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
    diagnostics: safeDiagnostics,
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
      const detail = error instanceof Error ? error.message : String(error);
      console.warn("[createIncident] email failed:", detail);
      email = { error: INCIDENT_EMAIL_FAILED_CODE };
    }
    await incidentRef.update({ email, updatedAt: now().toISOString() });
  }

  return { incidentId, status };
}
