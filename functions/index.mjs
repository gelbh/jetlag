/** Cloud Functions entry (Node.js 24). */
import { createHash } from "node:crypto";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { setCors } from "./cors.mjs";
import { logMissingAppCheckToken } from "./appCheck.mjs";
import {
  getSentryDsnSecret,
  captureFunctionsException,
  withSentryEventHandler,
  withSentryHttpHandler,
} from "./sentry.mjs";
import { fetchWithTimeout, fetchWithTimeoutAndRetry } from "./fetchWithTimeout.mjs";
import { createMemoryCache } from "./memoryCache.mjs";
import { OVERPASS_ENDPOINTS, OVERPASS_USER_AGENT } from "./overpassEndpoints.mjs";
import { normalizeTflPayload } from "./tflNormalize.mjs";
import { fetchTransitlandVehicles } from "./transitlandProxy.mjs";
import { fetchCtaVehicles } from "./ctaProxy.mjs";
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
import {
  parseBoundingBoxQuery,
  parseOverpassQueryBody,
  parseTransitlandFeedQuery,
  parseVehiclesMetroQuery,
} from "./proxyValidation.mjs";
import {
  handlePendingQuestionWrite,
  handleSessionMessageWrite,
  handleSessionTimerWrite,
} from "./sessionNotificationTriggers.mjs";
import {
  clearGrantAccessFailures,
  consumeRateLimit,
  getGrantAccessFailureCount,
  recordGrantAccessFailure,
} from "./firestoreRateLimit.mjs";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import {
  STRIPE_BILLING_PARAMS,
  STRIPE_BILLING_SECRETS,
  stripeSecretKey,
  stripeWebhookSecret,
} from "./stripeConfig.mjs";
import {
  createBillingPortalSessionHandler,
  createCheckoutSessionHandler,
  createPremiumSessionHandler,
  createStripeClient,
  getPremiumEntitlementsHandler,
} from "./stripeBilling.mjs";
import { handleStripeWebhook } from "./stripeWebhook.mjs";

const accessCodeSecret = defineSecret("ACCESS_CODE");
const transitlandApiKeySecret = defineSecret("TRANSITLAND_API_KEY");
const ctaBusTrackerApiKeySecret = defineSecret("CTA_BUS_TRACKER_API_KEY");
const ctaTrainTrackerApiKeySecret = defineSecret("CTA_TRAIN_TRACKER_API_KEY");
const sentryDsnSecret = getSentryDsnSecret();

if (getApps().length === 0) {
  initializeApp();
}

const FEEDS = {
  london: "https://api.tfl.gov.uk/vehicle/vehiclepositions",
};

const TFL_FETCH_TIMEOUT_MS = 10_000;
const OVERPASS_FETCH_TIMEOUT_MS = 25_000;
const VEHICLE_FEED_CACHE_TTL_MS = 15_000;
const VEHICLE_ROUTE_CACHE_TTL_MS = 60 * 60 * 1000;
const OVERPASS_CACHE_TTL_MS = 60 * 60 * 1000;
const GRANT_ACCESS_FAILURE_DELAY_MS = 300;
const GRANT_ACCESS_MAX_FAILURES = 8;
const GRANT_ACCESS_WINDOW_MS = 15 * 60 * 1000;

const PROXY_RATE_LIMITS = {
  overpass: {
    free: { limit: 20, windowMs: 60_000 },
    premium: { limit: 60, windowMs: 60_000 },
  },
  transitland: { limit: 30, windowMs: 60_000 },
  vehicles: { limit: 30, windowMs: 60_000 },
};

const vehicleFeedCache = createMemoryCache(VEHICLE_FEED_CACHE_TTL_MS);
const vehicleRouteCache = createMemoryCache(VEHICLE_ROUTE_CACHE_TTL_MS);
const overpassResponseCache = createMemoryCache(OVERPASS_CACHE_TTL_MS);

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

function sendRateLimitFailure(res, retryAfterMs) {
  if (retryAfterMs > 0) {
    res.set("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
  }
  res.status(429).json({ error: "Too many requests. Try again later." });
}

async function enforceRateLimit(res, route, uid, tier = "free") {
  const routeLimits = PROXY_RATE_LIMITS[route];
  const limits =
    route === "overpass"
      ? routeLimits[tier] ?? routeLimits.free
      : routeLimits;
  const { limit, windowMs } = limits;
  const result = await consumeRateLimit(adminDb(), { route, uid, limit, windowMs });
  if (!result.allowed) {
    sendRateLimitFailure(res, result.retryAfterMs ?? 0);
    return false;
  }

  return true;
}

async function requireProxyAccess(req, res) {
  const authResult = await verifyProxyAccess(adminAuth(), adminDb(), req);
  if (!authResult.ok) {
    sendProxyAuthFailure(res, authResult);
    return null;
  }

  return authResult;
}

async function requireOverpassProxyAccess(req, res) {
  const authResult = await verifyOverpassProxyAccess(adminAuth(), adminDb(), req);
  if (!authResult.ok) {
    sendProxyAuthFailure(res, authResult);
    return null;
  }

  return authResult;
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
  withSentryHttpHandler(async (req, res) => {
  setCors(res, req);
  logMissingAppCheckToken(req, "vehicles");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const authResult = await requireProxyAccess(req, res);
  if (!authResult) {
    return;
  }

  if (!(await enforceRateLimit(res, "vehicles", authResult.uid))) {
    return;
  }

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

  try {
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

      const vehicles = await fetchCtaVehicles({
        busApiKey: busApiKey || null,
        trainApiKey: trainApiKey || null,
        bounds,
        routeCache: vehicleRouteCache,
      });
      res.status(200).json(vehicles);
      return;
    }

    res.status(404).json({ error: "Unknown metro feed." });
  } catch (error) {
    captureFunctionsException(error);
    res.status(502).json({ error: "Transit proxy failed." });
  }
}),
);

export const transitland = onRequest(
  { secrets: [transitlandApiKeySecret, sentryDsnSecret] },
  withSentryHttpHandler(async (req, res) => {
    setCors(res, req);
    logMissingAppCheckToken(req, "transitland");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const authResult = await requireProxyAccess(req, res);
    if (!authResult) {
      return;
    }

    if (!(await enforceRateLimit(res, "transitland", authResult.uid))) {
      return;
    }

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

    try {
      const vehicles = await fetchTransitlandVehicles(feed, apiKey, bounds);
      res.status(200).json(vehicles);
    } catch (error) {
      captureFunctionsException(error);
      res.status(502).json({ error: "Transitland proxy failed." });
    }
  }),
);

export const overpass = onRequest(
  { secrets: [sentryDsnSecret] },
  withSentryHttpHandler(async (req, res) => {
  setCors(res, req);
  logMissingAppCheckToken(req, "overpass");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const authResult = await requireOverpassProxyAccess(req, res);
  if (!authResult) {
    return;
  }

  if (!(await enforceRateLimit(res, "overpass", authResult.uid, authResult.tier))) {
    return;
  }

  const queryResult = parseOverpassQueryBody(req.body);
  if (!queryResult.ok) {
    res.status(400).json({ error: queryResult.error });
    return;
  }

  const query = queryResult.value;

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
  } catch (error) {
    captureFunctionsException(error);
    res.status(504).json({ error: "Overpass timed out." });
  }
}),
);

export const purgeStaleSessions = onSchedule(
  { schedule: "0 4 * * *", secrets: [sentryDsnSecret] },
  withSentryEventHandler(async () => {
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
}),
);

export const notifyPendingQuestion = onDocumentWritten(
  {
    document: "sessions/{sessionId}/pendingQuestions/{questionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handlePendingQuestionWrite(adminDb(), event);
  }),
);

export const notifySessionTimer = onDocumentWritten(
  {
    document: "sessions/{sessionId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleSessionTimerWrite(adminDb(), event);
  }),
);

export const notifySessionMessage = onDocumentWritten(
  {
    document: "sessions/{sessionId}/messages/{messageId}",
    secrets: [sentryDsnSecret],
  },
  withSentryEventHandler(async (event) => {
    await handleSessionMessageWrite(adminDb(), event);
  }),
);

const stripeBillingOptions = {
  secrets: [...STRIPE_BILLING_SECRETS, sentryDsnSecret],
  params: STRIPE_BILLING_PARAMS,
};

export const getPremiumEntitlements = onCall(stripeBillingOptions, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  return getPremiumEntitlementsHandler(adminDb(), request.auth.uid);
});

export const createCheckoutSession = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const productKey =
      typeof request.data?.productKey === "string"
        ? request.data.productKey.trim()
        : "";
    const startTrial = request.data?.startTrial === true;

    if (!productKey) {
      throw new HttpsError("invalid-argument", "Product key required.");
    }

    const stripe = createStripeClient(stripeSecretKey.value());
    return createCheckoutSessionHandler(
      stripe,
      adminDb(),
      request.auth.uid,
      request.auth.token.email,
      productKey,
      startTrial,
    );
  },
);

export const createBillingPortalSession = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    const stripe = createStripeClient(stripeSecretKey.value());
    return createBillingPortalSessionHandler(
      stripe,
      adminDb(),
      request.auth.uid,
    );
  },
);

export const createPremiumSession = onCall(
  { ...stripeBillingOptions, enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    return createPremiumSessionHandler(
      adminDb(),
      request.auth.uid,
      request.data,
    );
  },
);

export const stripeWebhook = onRequest(
  {
    secrets: [stripeWebhookSecret, sentryDsnSecret],
  },
  withSentryHttpHandler(async (req, res) => {
    await handleStripeWebhook(
      adminDb(),
      stripeWebhookSecret.value(),
      req,
      res,
    );
  }),
);
