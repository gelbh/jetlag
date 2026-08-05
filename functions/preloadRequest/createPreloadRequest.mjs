import { randomUUID } from "node:crypto";

export const CREATE_PRELOAD_REQUEST_ROUTE = "createPreloadRequest";
export const PRELOAD_RATE_LIMIT = 3;
export const PRELOAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
/** Hard cap on serialized preset snapshot to reject abusive payloads. */
export const PRELOAD_SNAPSHOT_MAX_BYTES = 16 * 1024;
export const PRELOAD_NOTE_MAX_LENGTH = 140;

export const PRELOAD_INVALID_SNAPSHOT = "PRELOAD_INVALID_SNAPSHOT";
export const PRELOAD_PAYLOAD_TOO_LARGE = "PRELOAD_PAYLOAD_TOO_LARGE";
export const PRELOAD_RATE_LIMITED = "PRELOAD_RATE_LIMITED";
export const PRELOAD_UNAUTHENTICATED = "PRELOAD_UNAUTHENTICATED";

/** Client-visible email failure code (details stay server-side in logs). */
export const PRELOAD_EMAIL_FAILED_CODE = "email_failed";

const SNAPSHOT_ALLOWED_KEYS = [
  "name",
  "placeLabel",
  "gameSize",
  "distanceUnit",
  "focusBounds",
  "gameAreaBytes",
  "regionPackId",
  "presetId",
];

const GAME_SIZES = new Set(["small", "medium", "large"]);
const DISTANCE_UNITS = new Set(["imperial", "metric"]);

function clampNote(note) {
  if (typeof note !== "string") {
    return null;
  }
  const trimmed = note.trim().slice(0, PRELOAD_NOTE_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeFocusBounds(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const { south, west, north, east } = value;
  if (
    !isFiniteNumber(south) ||
    !isFiniteNumber(west) ||
    !isFiniteNumber(north) ||
    !isFiniteNumber(east)
  ) {
    return undefined;
  }
  return { south, west, north, east };
}

function assertValidSnapshot(snapshot) {
  if (
    typeof snapshot !== "object" ||
    snapshot === null ||
    Array.isArray(snapshot)
  ) {
    throw new Error(PRELOAD_INVALID_SNAPSHOT);
  }
  if (typeof snapshot.name !== "string" || snapshot.name.trim().length === 0) {
    throw new Error(PRELOAD_INVALID_SNAPSHOT);
  }
  if (!GAME_SIZES.has(snapshot.gameSize)) {
    throw new Error(PRELOAD_INVALID_SNAPSHOT);
  }
  if (!DISTANCE_UNITS.has(snapshot.distanceUnit)) {
    throw new Error(PRELOAD_INVALID_SNAPSHOT);
  }
  const serialized = JSON.stringify(snapshot);
  if (Buffer.byteLength(serialized, "utf8") > PRELOAD_SNAPSHOT_MAX_BYTES) {
    throw new Error(PRELOAD_PAYLOAD_TOO_LARGE);
  }
}

function sanitizeSnapshot(snapshot) {
  const out = {
    name: snapshot.name.trim().slice(0, 120),
    gameSize: snapshot.gameSize,
    distanceUnit: snapshot.distanceUnit,
  };

  if (typeof snapshot.placeLabel === "string" && snapshot.placeLabel.trim()) {
    out.placeLabel = snapshot.placeLabel.trim().slice(0, 200);
  }

  const focusBounds = sanitizeFocusBounds(snapshot.focusBounds);
  if (focusBounds) {
    out.focusBounds = focusBounds;
  }

  if (
    typeof snapshot.gameAreaBytes === "number" &&
    Number.isFinite(snapshot.gameAreaBytes) &&
    snapshot.gameAreaBytes >= 0
  ) {
    out.gameAreaBytes = Math.floor(snapshot.gameAreaBytes);
  }

  if (typeof snapshot.regionPackId === "string" && snapshot.regionPackId) {
    out.regionPackId = snapshot.regionPackId.slice(0, 64);
  }

  if (typeof snapshot.presetId === "string" && snapshot.presetId) {
    out.presetId = snapshot.presetId.slice(0, 128);
  }

  // Drop any unexpected keys by reconstructing from allowlist only.
  const allowed = {};
  for (const key of SNAPSHOT_ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      allowed[key] = out[key];
    }
  }
  return allowed;
}

function buildEmailText({ requestId, status, note, presetSnapshot, requestUrl }) {
  const lines = [
    `Preload request ${requestId}`,
    `Status: ${status}`,
    `Preset: ${presetSnapshot.name}`,
    `Size: ${presetSnapshot.gameSize}`,
    `Units: ${presetSnapshot.distanceUnit}`,
  ];
  if (presetSnapshot.placeLabel) {
    lines.push(`Place: ${presetSnapshot.placeLabel}`);
  }
  if (presetSnapshot.regionPackId) {
    lines.push(`Region pack: ${presetSnapshot.regionPackId}`);
  }
  if (presetSnapshot.focusBounds) {
    const b = presetSnapshot.focusBounds;
    lines.push(
      `Focus bounds: ${b.south.toFixed(4)},${b.west.toFixed(4)} → ${b.north.toFixed(4)},${b.east.toFixed(4)}`,
    );
  }
  if (typeof presetSnapshot.gameAreaBytes === "number") {
    lines.push(`Game area bytes: ${presetSnapshot.gameAreaBytes}`);
  }
  if (note) {
    lines.push(`Note: ${note}`);
  }
  lines.push("", `Open request: ${requestUrl}`);
  return lines.join("\n");
}

/**
 * Validate + create a preload request: writes `preloadRequests/{id}`, then
 * attempts a best-effort email hop via the incident Worker endpoint.
 * Email failures are recorded but never fail creation.
 *
 * @param db Firestore instance (admin SDK or a compatible mock).
 * @param input { uid, note, presetSnapshot }
 * @param deps { rateLimit, sendEmail, now, generateId, requestUrlBase }
 */
export async function createPreloadRequestHandler(db, input, deps) {
  const { uid } = input;
  if (!uid) {
    throw new Error(PRELOAD_UNAUTHENTICATED);
  }

  assertValidSnapshot(input.presetSnapshot);
  const presetSnapshot = sanitizeSnapshot(input.presetSnapshot);

  const rateLimit = deps.rateLimit;
  const now = deps.now ?? (() => new Date());
  const generateId = deps.generateId ?? (() => randomUUID());
  const requestUrlBase = (deps.requestUrlBase ?? "").replace(/\/+$/, "");

  const rl = await rateLimit({
    route: CREATE_PRELOAD_REQUEST_ROUTE,
    uid,
    limit: PRELOAD_RATE_LIMIT,
    windowMs: PRELOAD_RATE_LIMIT_WINDOW_MS,
  });
  if (!rl?.allowed) {
    throw new Error(PRELOAD_RATE_LIMITED);
  }

  const requestId = generateId();
  const nowIso = now().toISOString();
  const status = "open";
  const note = clampNote(input.note);

  const requestRef = db.collection("preloadRequests").doc(requestId);
  await requestRef.set({
    id: requestId,
    status,
    createdAt: nowIso,
    updatedAt: nowIso,
    reporterUid: uid,
    presetSnapshot,
    note,
    email: {},
  });

  const requestUrl = requestUrlBase
    ? `${requestUrlBase}/admin/preload-requests/${requestId}`
    : `/admin/preload-requests/${requestId}`;

  let email = { error: "not_sent" };
  if (typeof deps.sendEmail === "function") {
    try {
      const subject = `Preload request: ${presetSnapshot.name}`;
      const text = buildEmailText({
        requestId,
        status,
        note,
        presetSnapshot,
        requestUrl,
      });
      const result = await deps.sendEmail({
        subject,
        text,
        incidentUrl: requestUrl,
      });
      email = {
        sentAt: now().toISOString(),
        messageId: result?.messageId ?? null,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn("[createPreloadRequest] email failed:", detail);
      email = { error: PRELOAD_EMAIL_FAILED_CODE };
    }
    await requestRef.update({ email, updatedAt: now().toISOString() });
  }

  return { requestId, status };
}
