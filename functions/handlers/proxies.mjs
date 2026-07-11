import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { withSentryHttpHandler, getSentryDsnSecret } from "../sentry.mjs";
import { fetchWithTimeoutAndRetry } from "../fetchWithTimeout.mjs";
import { createMemoryCache } from "../memoryCache.mjs";
import { fetchCachedOverpassQuery } from "../overpassProxyCore.mjs";
import { normalizeTflPayload } from "../tflNormalize.mjs";
import { fetchTransitlandVehicles } from "../transitlandProxy.mjs";
import { fetchCtaVehicles } from "../ctaProxy.mjs";
import {
  parseBoundingBoxQuery,
  parseOverpassQueryBody,
  parseTransitlandFeedQuery,
  parseVehiclesMetroQuery,
} from "../proxyValidation.mjs";
import { adminAuth, requireOverpassProxyAccess } from "./proxyShared.mjs";
import {
  clearGrantAccessFailures,
  getGrantAccessFailureCount,
  recordGrantAccessFailure,
} from "../firestoreRateLimit.mjs";
import { getFirestore } from "firebase-admin/firestore";
import { createProxyHandler } from "../createProxyHandler.mjs";

const accessCodeSecret = defineSecret("ACCESS_CODE");
const transitlandApiKeySecret = defineSecret("TRANSITLAND_API_KEY");
const ctaBusTrackerApiKeySecret = defineSecret("CTA_BUS_TRACKER_API_KEY");
const ctaTrainTrackerApiKeySecret = defineSecret("CTA_TRAIN_TRACKER_API_KEY");
const sentryDsnSecret = getSentryDsnSecret();

const FEEDS = {
  london: "https://api.tfl.gov.uk/vehicle/vehiclepositions",
};

const TFL_FETCH_TIMEOUT_MS = 10_000;
const VEHICLE_FEED_CACHE_TTL_MS = 15_000;
const VEHICLE_ROUTE_CACHE_TTL_MS = 60 * 60 * 1000;
const GRANT_ACCESS_FAILURE_DELAY_MS = 300;
const GRANT_ACCESS_MAX_FAILURES = 8;
const GRANT_ACCESS_WINDOW_MS = 15 * 60 * 1000;

const vehicleFeedCache = createMemoryCache(VEHICLE_FEED_CACHE_TTL_MS);
const vehicleRouteCache = createMemoryCache(VEHICLE_ROUTE_CACHE_TTL_MS);

function adminDb() {
  return getFirestore();
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

export const grantAccess = onCall(
  { secrets: [accessCodeSecret], enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const uid = request.auth.uid;
    const failures = await getGrantAccessFailureCount(adminDb(), uid, {
      windowMs: GRANT_ACCESS_WINDOW_MS,
    });
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
      await recordGrantAccessFailure(adminDb(), uid, {
        maxFailures: GRANT_ACCESS_MAX_FAILURES,
        windowMs: GRANT_ACCESS_WINDOW_MS,
      });
      await new Promise((resolve) => {
        setTimeout(resolve, GRANT_ACCESS_FAILURE_DELAY_MS);
      });
      throw new HttpsError("permission-denied", "Invalid access code.");
    }

    await clearGrantAccessFailures(adminDb(), uid);
    await adminAuth().setCustomUserClaims(uid, { access: true });
    return { granted: true };
  },
);

export const vehicles = onRequest(
  {
    secrets: [
      sentryDsnSecret,
      ctaBusTrackerApiKeySecret,
      ctaTrainTrackerApiKeySecret,
    ],
  },
  withSentryHttpHandler(
    createProxyHandler({
      routeName: "vehicles",
      defaultErrorMessage: "Transit proxy failed.",
      handler: async (req, res) => {
        const metroResult = parseVehiclesMetroQuery(req.query);
        if (!metroResult.ok) {
          res.status(404).json({ error: metroResult.error });
          return;
        }

        const boundsResult = parseBoundingBoxQuery(req.query);
        if (!boundsResult.ok) {
          res.status(400).json({ error: boundsResult.error });
          return;
        }

        const metro = metroResult.value;
        const bounds = boundsResult.value;

        if (metro === "london") {
          const feedUrl = FEEDS[metro];
          const payload = await loadTflFeed(metro, feedUrl);
          res.status(200).json(normalizeTflPayload(payload, bounds));
          return;
        }

        if (metro === "chicago") {
          const busApiKey = ctaBusTrackerApiKeySecret.value()?.trim();
          const trainApiKey = ctaTrainTrackerApiKeySecret.value()?.trim();
          if (!busApiKey && !trainApiKey) {
            res.status(503).json({ error: "CTA proxy is not configured." });
            return;
          }

          const vehicleList = await fetchCtaVehicles({
            busApiKey: busApiKey || null,
            trainApiKey: trainApiKey || null,
            bounds,
            routeCache: vehicleRouteCache,
          });
          res.status(200).json(vehicleList);
          return;
        }

        res.status(404).json({ error: "Unknown metro feed." });
      },
    }),
  ),
);

export const transitland = onRequest(
  { secrets: [transitlandApiKeySecret, sentryDsnSecret] },
  withSentryHttpHandler(
    createProxyHandler({
      routeName: "transitland",
      defaultErrorMessage: "Transitland proxy failed.",
      handler: async (req, res) => {
        const feedResult = parseTransitlandFeedQuery(req.query);
        if (!feedResult.ok) {
          res.status(400).json({ error: feedResult.error });
          return;
        }

        const boundsResult = parseBoundingBoxQuery(req.query);
        if (!boundsResult.ok) {
          res.status(400).json({ error: boundsResult.error });
          return;
        }

        const feed = feedResult.value;
        const bounds = boundsResult.value;

        const apiKey = transitlandApiKeySecret.value();
        if (!apiKey) {
          res.status(503).json({ error: "Transitland proxy is not configured." });
          return;
        }

        const vehicleList = await fetchTransitlandVehicles(feed, apiKey, bounds);
        res.status(200).json(vehicleList);
      },
    }),
  ),
);

export const overpass = onRequest(
  { secrets: [sentryDsnSecret] },
  withSentryHttpHandler(
    createProxyHandler({
      routeName: "overpass",
      methods: ["POST"],
      requireAccess: requireOverpassProxyAccess,
      defaultErrorMessage: "Overpass query failed.",
      handler: async (req, res, authResult) => {
        const queryResult = parseOverpassQueryBody(req.body);
        if (!queryResult.ok) {
          res.status(400).json({ error: queryResult.error });
          return;
        }

        const query = queryResult.value;
        const text = await fetchCachedOverpassQuery(query, authResult.tier);
        res.status(200).type("application/json").send(text);
      },
    }),
  ),
);
