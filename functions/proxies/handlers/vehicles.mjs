import { defineSecret } from "firebase-functions/params";
import { fetchWithTimeoutAndRetry } from "../../lib/fetchWithTimeout.mjs";
import { createMemoryCache } from "../../lib/memoryCache.mjs";
import { normalizeTflPayload } from "../tflNormalize.mjs";
import { fetchCtaVehicles } from "../ctaProxy.mjs";
import {
  parseBoundingBoxQuery,
  parseVehiclesMetroQuery,
} from "../proxyValidation.mjs";
import { createProxyHandler } from "../createProxyHandler.mjs";

export const ctaBusTrackerApiKeySecret = defineSecret("CTA_BUS_TRACKER_API_KEY");
export const ctaTrainTrackerApiKeySecret = defineSecret(
  "CTA_TRAIN_TRACKER_API_KEY",
);

const FEEDS = {
  london: "https://api.tfl.gov.uk/vehicle/vehiclepositions",
};

const TFL_FETCH_TIMEOUT_MS = 10_000;
const VEHICLE_FEED_CACHE_TTL_MS = 15_000;
const VEHICLE_ROUTE_CACHE_TTL_MS = 60 * 60 * 1000;

const vehicleFeedCache = createMemoryCache(VEHICLE_FEED_CACHE_TTL_MS);
const vehicleRouteCache = createMemoryCache(VEHICLE_ROUTE_CACHE_TTL_MS);

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

export const vehiclesHandler = createProxyHandler({
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
});
