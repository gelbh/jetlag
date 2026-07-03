import { createHash } from "node:crypto";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setCors } from "./cors.mjs";
import { fetchWithTimeoutAndRetry } from "./fetchWithTimeout.mjs";
import { createMemoryCache } from "./memoryCache.mjs";
import { normalizeTflPayload } from "./tflNormalize.mjs";
import {
  computeAbandonedCutoffIso,
  computeEndedCutoffIso,
  PURGE_BATCH_LIMIT,
  selectSessionsToPurge,
} from "./purgeStaleSessions.mjs";

const FEEDS = {
  london: "https://api.tfl.gov.uk/vehicle/vehiclepositions",
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const OVERPASS_USER_AGENT = "jetlag-map-companion/1.0";
const TFL_FETCH_TIMEOUT_MS = 10_000;
const OVERPASS_FETCH_TIMEOUT_MS = 45_000;
const VEHICLE_FEED_CACHE_TTL_MS = 15_000;
const OVERPASS_CACHE_TTL_MS = 15 * 60 * 1000;

const vehicleFeedCache = createMemoryCache(VEHICLE_FEED_CACHE_TTL_MS);
const overpassResponseCache = createMemoryCache(OVERPASS_CACHE_TTL_MS);

function overpassCacheKey(query) {
  return createHash("sha256").update(query).digest("hex");
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

export const vehicles = onRequest(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
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
    const response = await fetchWithTimeoutAndRetry(
      OVERPASS_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": OVERPASS_USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      },
      OVERPASS_FETCH_TIMEOUT_MS,
      1,
    );

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

function ensureAdminApp() {
  if (getApps().length === 0) {
    initializeApp();
  }
}

export const purgeStaleSessions = onSchedule("0 4 * * *", async () => {
  ensureAdminApp();
  const db = getFirestore();
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
