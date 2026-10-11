import { randomUUID } from "node:crypto";
import { buildAdminPrompt } from "./adminPrompt.mjs";
import { INCIDENT_EMAIL_FAILED_CODE } from "./createIncident.mjs";
import { verifyStandardWebhook } from "./verifyStandardWebhook.mjs";

export const POSTHOG_ALERT_ROUTE = "posthogErrorAlert";
export const POSTHOG_ALERT_MAX_BODY_BYTES = 16 * 1024;
export const POSTHOG_ALERT_RATE_LIMIT = 20;
export const POSTHOG_ALERT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const POSTHOG_ALERT_INVALID_PAYLOAD = "POSTHOG_ALERT_INVALID_PAYLOAD";

const ISSUE_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const POSTHOG_ISSUE_URL_PREFIX = "https://eu.posthog.com/";
const NAME_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 300;
/** Firestore `ALREADY_EXISTS` from `DocumentReference.create`. */
const ALREADY_EXISTS_CODE = 6;

function clampString(value, max) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

function parsePayload(payload) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error(POSTHOG_ALERT_INVALID_PAYLOAD);
  }
  const issueId = typeof payload.issueId === "string" ? payload.issueId.trim() : "";
  const name = clampString(payload.name, NAME_MAX_LENGTH);
  if (!ISSUE_ID_PATTERN.test(issueId) || !name) {
    throw new Error(POSTHOG_ALERT_INVALID_PAYLOAD);
  }
  const issueUrl = clampString(payload.issueUrl, 2048);
  const exceptionAt =
    typeof payload.exceptionTimestamp === "string" &&
    !Number.isNaN(Date.parse(payload.exceptionTimestamp))
      ? new Date(payload.exceptionTimestamp).toISOString()
      : null;
  return {
    issueId,
    name,
    description: clampString(payload.description, DESCRIPTION_MAX_LENGTH),
    issueUrl: issueUrl?.startsWith(POSTHOG_ISSUE_URL_PREFIX) ? issueUrl : null,
    exceptionAt,
  };
}

/**
 * Turn a PostHog "issue created" alert into an admin desk incident + admin email.
 * Idempotent per issue (`posthog-<issueId>` + `create()`); never launches a Cursor hotfix.
 *
 * @param db Firestore instance (admin SDK or a compatible mock).
 * @param payload Webhook JSON body configured on the PostHog alert.
 * @param deps { rateLimit, sendEmail?, now?, generateId?, incidentUrlBase? }
 */
export async function ingestPosthogAlert(db, payload, deps) {
  const alert = parsePayload(payload);
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());
  const incidentUrlBase = (deps.incidentUrlBase ?? "").replace(/\/+$/, "");

  const rl = await deps.rateLimit({
    route: POSTHOG_ALERT_ROUTE,
    uid: "posthog",
    limit: POSTHOG_ALERT_RATE_LIMIT,
    windowMs: POSTHOG_ALERT_RATE_LIMIT_WINDOW_MS,
  });
  if (!rl?.allowed) {
    return { status: "dropped", reason: "rate_limited" };
  }

  const incidentId = `posthog-${alert.issueId}`;
  const nowIso = now().toISOString();
  const status = "open";
  const diagnostics = {
    appVersion: "unknown",
    route: "posthog",
    sessionId: null,
    sessionCode: null,
    playerRole: null,
    uid: null,
    userAgent: "",
    platform: "web",
    online: true,
    visibilityState: "n/a",
    lastClientErrors: [
      {
        name: alert.name,
        ...(alert.description ? { message: alert.description } : {}),
        at: alert.exceptionAt ?? nowIso,
        posthogExceptionId: alert.issueId,
      },
    ],
    recentOps: [],
    reportedAt: nowIso,
  };
  const playerNote = `PostHog alert: ${alert.name}`;
  const adminPrompt = buildAdminPrompt({ incidentId, status, playerNote, diagnostics });

  const incidentRef = db.collection("incidents").doc(incidentId);
  try {
    await incidentRef.create({
      status,
      source: "posthog_alert",
      createdAt: nowIso,
      updatedAt: nowIso,
      sessionId: null,
      sessionCode: null,
      reporterUid: null,
      reporterRole: null,
      playerNote,
      diagnostics,
      adminPrompt,
      posthogIssue: { id: alert.issueId, name: alert.name, url: alert.issueUrl },
      triage: { outcome: "admin", reason: "posthog_alert" },
      email: {},
    });
  } catch (error) {
    if (error?.code === ALREADY_EXISTS_CODE) {
      return { status: "duplicate", incidentId };
    }
    throw error;
  }

  await incidentRef.collection("messages").doc(generateId()).set({
    sender: "system",
    kind: "prompt",
    text: adminPrompt,
    createdAt: nowIso,
  });

  if (typeof deps.sendEmail === "function") {
    const incidentUrl = `${incidentUrlBase}/admin/incidents/${incidentId}`;
    let email;
    try {
      const result = await deps.sendEmail({
        subject: `Jet Lag PostHog issue: ${alert.name}`,
        text: [
          adminPrompt,
          alert.issueUrl ? `PostHog issue: ${alert.issueUrl}` : null,
          `Open incident: ${incidentUrl}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        incidentUrl,
      });
      email = { sentAt: now().toISOString(), messageId: result?.messageId ?? null };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn("[ingestPosthogAlert] email failed:", detail);
      email = { error: INCIDENT_EMAIL_FAILED_CODE };
    }
    await incidentRef.update({ email, updatedAt: now().toISOString() });
  }

  return { status: "created", incidentId };
}

/**
 * HTTP shell for the PostHog alert webhook: method, size cap, Standard Webhooks
 * signature, then {@link ingestPosthogAlert}. Returns `{ status, body }`.
 *
 * @param request { method, headers, rawBody }
 * @param deps { db, secret, ingest } where `ingest` is the {@link ingestPosthogAlert} deps
 */
export async function handlePosthogAlertRequest(
  { method, headers, rawBody },
  { db, secret, ingest },
) {
  if (method !== "POST") {
    return { status: 405, body: { error: "method_not_allowed" } };
  }
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody ?? ""));
  if (body.byteLength > POSTHOG_ALERT_MAX_BODY_BYTES) {
    return { status: 413, body: { error: "payload_too_large" } };
  }
  if (
    !verifyStandardWebhook({
      secret,
      headers,
      rawBody: body,
      nowMs: (ingest.now?.() ?? new Date()).getTime(),
    })
  ) {
    return { status: 401, body: { error: "invalid_signature" } };
  }

  let payload;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    return { status: 400, body: { error: "invalid_json" } };
  }
  try {
    return { status: 200, body: await ingestPosthogAlert(db, payload, ingest) };
  } catch (error) {
    if (error instanceof Error && error.message === POSTHOG_ALERT_INVALID_PAYLOAD) {
      return { status: 400, body: { error: "invalid_payload" } };
    }
    throw error;
  }
}
