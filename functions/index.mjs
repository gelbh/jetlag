import { createHash } from "node:crypto";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { setCors } from "./cors.mjs";
import { fetchWithTimeout, fetchWithTimeoutAndRetry } from "./fetchWithTimeout.mjs";
import { createMemoryCache } from "./memoryCache.mjs";
import { OVERPASS_ENDPOINTS, OVERPASS_USER_AGENT } from "./overpassEndpoints.mjs";
import { normalizeTflPayload } from "./tflNormalize.mjs";
import { fetchTransitlandVehicles } from "./transitlandProxy.mjs";
import {
  sendProxyAuthFailure,
  verifyOverpassProxyAccess,
  verifyProxyAccess,
} from "./verifyProxyAccess.mjs";
import {
  computeAbandonedCutoffIso,
  computeEndedCutoffIso,
  PURGE_BATCH_LIMIT,
  selectSessionsToPurge,
} from "./purgeStaleSessions.mjs";

const accessCodeSecret = defineSecret("ACCESS_CODE");
const transitlandApiKeySecret = defineSecret("TRANSITLAND_API_KEY");

if (getApps().length === 0) {
  initializeApp();
}

const FEEDS = {
  london: "https://api.tfl.gov.uk/vehicle/vehiclepositions",
};

const TFL_FETCH_TIMEOUT_MS = 10_000;
const OVERPASS_FETCH_TIMEOUT_MS = 25_000;
const VEHICLE_FEED_CACHE_TTL_MS = 15_000;
const OVERPASS_CACHE_TTL_MS = 60 * 60 * 1000;
const GRANT_ACCESS_FAILURE_DELAY_MS = 300;
const GRANT_ACCESS_MAX_FAILURES = 8;

const vehicleFeedCache = createMemoryCache(VEHICLE_FEED_CACHE_TTL_MS);
const overpassResponseCache = createMemoryCache(OVERPASS_CACHE_TTL_MS);
const grantAccessFailures = new Map();

function adminAuth() {
  return getAuth();
}

function adminDb() {
  return getFirestore();
}

function overpassCacheKey(query) {
  return createHash("sha256").update(query).digest("hex");
}

async function fetchOverpassWithFailover(query) {
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": OVERPASS_USER_AGENT,
          },
          body: `data=${encodeURIComponent(query)}`,
        },
        OVERPASS_FETCH_TIMEOUT_MS,
      );

      if (response.ok) {
        return response;
      }

      if (
        response.status === 429 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        lastError = new Error("Overpass timed out.");
        continue;
      }

      throw new Error("Overpass query failed.");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Overpass timed out.");
}

async function loadTflFeed(metro, feedUrl) {
  const cached = vehicleFeedCache.get(metro);
  if (cached) {
    return cached;
  }

  const response = await fetchWithTimeoutAndRetry(
    feedUrl,
    { cache: "no-store" },
    TFL_FETCH_TIMEOUT_MS,
    1,
  );

  if (!response.ok) {
    throw new Error("Upstream feed failed.");
  }

  const payload = await response.json();
  vehicleFeedCache.set(metro, payload);
  return payload;
}

async function requireProxyAccess(req, res) {
  const authResult = await verifyProxyAccess(adminAuth(), adminDb(), req);
  if (!authResult.ok) {
    sendProxyAuthFailure(res, authResult);
    return false;
  }

  return true;
}

async function requireOverpassProxyAccess(req, res) {
  const authResult = await verifyOverpassProxyAccess(adminAuth(), adminDb(), req);
  if (!authResult.ok) {
    sendProxyAuthFailure(res, authResult);
    return false;
  }

  return true;
}

export const grantAccess = onCall(
  { secrets: [accessCodeSecret], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const uid = request.auth.uid;
    const failures = grantAccessFailures.get(uid) ?? 0;
    if (failures >= GRANT_ACCESS_MAX_FAILURES) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many attempts. Try again later.",
      );
    }

    const code =
      typeof request.data?.code === "string" ? request.data.code.trim() : "";
    if (!code) {
      throw new HttpsError("invalid-argument", "Access code required.");
    }

    const expected = accessCodeSecret.value();
    if (!expected || code !== expected) {
      grantAccessFailures.set(uid, failures + 1);
      await new Promise((resolve) => {
        setTimeout(resolve, GRANT_ACCESS_FAILURE_DELAY_MS);
      });
      throw new HttpsError("permission-denied", "Invalid access code.");
    }

    grantAccessFailures.delete(uid);
    await adminAuth().setCustomUserClaims(uid, { access: true });
    return { granted: true };
  },
);

export const vehicles = onRequest(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (!(await requireProxyAccess(req, res))) {
    return;
  }

  const metro = String(req.query.metro ?? "");
  const bounds = {
    south: Number(req.query.south),
    west: Number(req.query.west),
    north: Number(req.query.north),
    east: Number(req.query.east),
  };

  if (
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.north) ||
    !Number.isFinite(bounds.east)
  ) {
    res.status(400).json({ error: "Missing bounding box." });
    return;
  }

  const feedUrl = FEEDS[metro];
  if (!feedUrl) {
    res.status(404).json({ error: "Unknown metro feed." });
    return;
  }

  try {
    const payload = await loadTflFeed(metro, feedUrl);
    res.status(200).json(normalizeTflPayload(payload, bounds));
  } catch {
    res.status(502).json({ error: "Transit proxy failed." });
  }
});

export const transitland = onRequest(
  { secrets: [transitlandApiKeySecret] },
  async (req, res) => {
    setCors(res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (!(await requireProxyAccess(req, res))) {
      return;
    }

    const feed = String(req.query.feed ?? "").trim();
    const bounds = {
      south: Number(req.query.south),
      west: Number(req.query.west),
      north: Number(req.query.north),
      east: Number(req.query.east),
    };

    if (!feed) {
      res.status(400).json({ error: "Missing transit feed." });
      return;
    }

    if (
      !Number.isFinite(bounds.south) ||
      !Number.isFinite(bounds.west) ||
      !Number.isFinite(bounds.north) ||
      !Number.isFinite(bounds.east)
    ) {
      res.status(400).json({ error: "Missing bounding box." });
      return;
    }

    const apiKey = transitlandApiKeySecret.value();
    if (!apiKey) {
      res.status(503).json({ error: "Transitland proxy is not configured." });
      return;
    }

    try {
      const vehicles = await fetchTransitlandVehicles(feed, apiKey, bounds);
      res.status(200).json(vehicles);
    } catch {
      res.status(502).json({ error: "Transitland proxy failed." });
    }
  },
);

export const overpass = onRequest(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!(await requireOverpassProxyAccess(req, res))) {
    return;
  }

  const query =
    typeof req.body?.query === "string"
      ? req.body.query
      : typeof req.body === "string"
        ? req.body
        : null;

  if (!query || query.trim().length === 0) {
    res.status(400).json({ error: "Missing Overpass query." });
    return;
  }

  const cacheKey = overpassCacheKey(query);
  const cached = overpassResponseCache.get(cacheKey);
  if (cached) {
    res.status(200).type("application/json").send(cached);
    return;
  }

  try {
    const response = await fetchOverpassWithFailover(query);

    const text = await response.text();

    if (!response.ok) {
      if (response.status === 504) {
        res.status(504).json({ error: "Overpass timed out." });
        return;
      }

      res.status(502).json({ error: "Overpass query failed." });
      return;
    }

    overpassResponseCache.set(cacheKey, text);
    res.status(200).type("application/json").send(text);
  } catch {
    res.status(504).json({ error: "Overpass timed out." });
  }
});

export const purgeStaleSessions = onSchedule("0 4 * * *", async () => {
  const db = adminDb();
  const endedCutoffIso = computeEndedCutoffIso();
  const abandonedCutoffIso = computeAbandonedCutoffIso();

  const [endedSnapshot, abandonedSnapshot] = await Promise.all([
    db
      .collection("sessions")
      .where("status", "==", "ended")
      .where("endedAt", "<", endedCutoffIso)
      .limit(PURGE_BATCH_LIMIT)
      .get(),
    db
      .collection("sessions")
      .where("createdAt", "<", abandonedCutoffIso)
      .limit(PURGE_BATCH_LIMIT)
      .get(),
  ]);

  const targets = selectSessionsToPurge(
    endedSnapshot.docs,
    abandonedSnapshot.docs,
    endedCutoffIso,
    abandonedCutoffIso,
    PURGE_BATCH_LIMIT,
  );

  let deleted = 0;
  for (const sessionDoc of targets) {
    await db.recursiveDelete(sessionDoc.ref);
    deleted += 1;
  }

  console.info(
    `purgeStaleSessions deleted ${deleted} session(s); endedCutoff=${endedCutoffIso}; abandonedCutoff=${abandonedCutoffIso}`,
  );
});
