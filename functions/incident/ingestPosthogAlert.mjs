import { randomUUID } from "node:crypto";
import { buildAdminPrompt } from "./adminPrompt.mjs";
import { verifyStandardWebhook } from "./verifyStandardWebhook.mjs";

export const POSTHOG_ALERT_ROUTE = "posthogErrorAlert";
export const POSTHOG_ALERT_MAX_BODY_BYTES = 16 * 1024;
export const POSTHOG_ALERT_RATE_LIMIT = 20;
export const POSTHOG_ALERT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const POSTHOG_ALERT_INVALID_PAYLOAD = "POSTHOG_ALERT_INVALID_PAYLOAD";
export const POSTHOG_ALERT_TRIGGER_CREATED = "created";
export const POSTHOG_ALERT_TRIGGER_REOPENED = "reopened";
/** Incident statuses a reopened PostHog issue moves back to `open`. */
const REOPENABLE_STATUSES = new Set(["resolved", "dismissed"]);

const ISSUE_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const POSTHOG_ISSUE_URL_PREFIX = "https://eu.posthog.com/";
const NAME_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 300;
const RUNTIME_PATTERN = /^[a-z0-9-]{1,40}$/;
const METHOD_PATTERN = /^[A-Z]{1,10}$/;
const PATH_MAX_LENGTH = 200;
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
  const runtime = clampString(payload.runtime, 40);
  const method = clampString(payload.method, 10);
  const path = clampString(payload.path, PATH_MAX_LENGTH);
  return {
    issueId,
    name,
    description: clampString(payload.description, DESCRIPTION_MAX_LENGTH),
    issueUrl: issueUrl?.startsWith(POSTHOG_ISSUE_URL_PREFIX) ? issueUrl : null,
    exceptionAt,
    runtime: runtime && RUNTIME_PATTERN.test(runtime) ? runtime : null,
    method: method && METHOD_PATTERN.test(method) ? method : null,
    path: path?.startsWith("/") ? path : null,
    trigger:
      payload.trigger === POSTHOG_ALERT_TRIGGER_REOPENED
        ? POSTHOG_ALERT_TRIGGER_REOPENED
        : POSTHOG_ALERT_TRIGGER_CREATED,
  };
}

/**
 * Turn a PostHog "issue created" or "issue reopened" alert into an admin desk incident.
 * Idempotent per issue (`posthog-<issueId>` + `create()`); never launches a Cursor hotfix.
 * The admin email is only requested here (`email.requestedAt`); the `sendPosthogIncidentEmail`
 * trigger sends it so the webhook response does not wait on the email hop.
 *
 * @param db Firestore instance (admin SDK or a compatible mock).
 * @param payload Webhook JSON body configured on the PostHog alert.
 * @param deps { rateLimit, now?, generateId? }
 */
export async function ingestPosthogAlert(db, payload, deps) {
  const alert = parsePayload(payload);
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());

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
  const request = alert.path ? [alert.method, alert.path].filter(Boolean).join(" ") : null;
  const origin = alert.runtime ? [alert.runtime, request].filter(Boolean).join(" ") : null;
  const label = origin ? `${alert.name} (${origin})` : alert.name;
  const diagnostics = {
    appVersion: "unknown",
    route: (alert.runtime && request) || "posthog",
    sessionId: null,
    sessionCode: null,
    playerRole: null,
    uid: null,
    userAgent: "",
    platform: alert.runtime ?? "web",
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
  const reopened = alert.trigger === POSTHOG_ALERT_TRIGGER_REOPENED;
  const playerNote = `${reopened ? "PostHog alert (reopened)" : "PostHog alert"}: ${label}`;
  const adminPrompt = buildAdminPrompt({ incidentId, status, playerNote, diagnostics });

  const incidentRef = db.collection("incidents").doc(incidentId);
  if (reopened) {
    const existing = await incidentRef.get();
    if (existing.exists) {
      if (!REOPENABLE_STATUSES.has(existing.data()?.status)) {
        return { status: "duplicate", incidentId };
      }
      await incidentRef.collection("messages").doc(generateId()).set({
        sender: "system",
        kind: "chat",
        text: "PostHog issue reopened",
        createdAt: nowIso,
      });
      await incidentRef.update({
        status,
        updatedAt: nowIso,
        email: { requestedAt: nowIso, subject: `Jet Lag PostHog issue reopened: ${label}` },
      });
      return { status: "reopened", incidentId };
    }
  }
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
      email: { requestedAt: nowIso, subject: `Jet Lag PostHog issue: ${label}` },
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
