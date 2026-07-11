import { fetchWithTimeoutAndRetry } from "./fetchWithTimeout.mjs";

const CTA_BUS_API_BASE = "https://www.ctabustracker.com/bustime/api/v3";
const CTA_TRAIN_POSITIONS_URL =
  "http://lapi.transitchicago.com/api/1.0/ttpositions.aspx";
const CTA_FETCH_TIMEOUT_MS = 15_000;
const CTA_ROUTE_BATCH_SIZE = 10;
const CTA_TRAIN_ROUTES = [
  "red",
  "blue",
  "g",
  "brn",
  "p",
  "y",
  "org",
  "pnk",
  "purple",
];

function isInsideBounds(lat, lng, bounds) {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

function parseLatitude(value) {
  const lat = Number(value);
  return Number.isFinite(lat) ? lat : null;
}

function parseLongitude(value) {
  const lng = Number(value);
  return Number.isFinite(lng) ? lng : null;
}

function asArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function normalizeCtaBusVehicles(payload, bounds) {
  const root = payload?.["bustime-response"];
  if (!root || root.error) {
    return [];
  }

  const vehicles = [];
  for (const entry of asArray(root.vehicle)) {
    const lat = parseLatitude(entry.lat);
    const lng = parseLongitude(entry.lon);
    if (lat === null || lng === null) {
      continue;
    }

    if (!isInsideBounds(lat, lng, bounds)) {
      continue;
    }

    vehicles.push({
      id: String(entry.vid ?? `${lat},${lng}`),
      label: entry.des ? String(entry.des) : `Bus ${entry.rt ?? ""}`.trim(),
      lat,
      lng,
      bearing: Number.isFinite(Number(entry.hdg)) ? Number(entry.hdg) : undefined,
      routeRef: typeof entry.rt === "string" ? entry.rt : undefined,
      mode: "bus",
      updatedAt: new Date().toISOString(),
    });
  }

  return vehicles;
}

export function normalizeCtaTrainVehicles(payload, bounds) {
  const root = payload?.ctatt;
  if (!root || root.errCd !== "0") {
    return [];
  }

  const vehicles = [];
  for (const route of asArray(root.route)) {
    const routeRef =
      typeof route["@name"] === "string"
        ? route["@name"]
        : typeof route.name === "string"
          ? route.name
          : undefined;

    for (const train of asArray(route.train)) {
      const lat = parseLatitude(train.lat);
      const lng = parseLongitude(train.lon);
      if (lat === null || lng === null) {
        continue;
      }

      if (!isInsideBounds(lat, lng, bounds)) {
        continue;
      }

      vehicles.push({
        id: String(train.rn ?? `${routeRef ?? "train"}-${lat},${lng}`),
        label: train.destNm ? String(train.destNm) : routeRef ?? "Train",
        lat,
        lng,
        bearing: Number.isFinite(Number(train.heading))
          ? Number(train.heading)
          : undefined,
        routeRef,
        mode: "metro",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return vehicles;
}

async function fetchCtaBusJson(path, apiKey, searchParams = {}) {
  const url = new URL(`${CTA_BUS_API_BASE}/${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("format", "json");
  for (const [name, value] of Object.entries(searchParams)) {
    url.searchParams.set(name, value);
  }

  const response = await fetchWithTimeoutAndRetry(
    url.toString(),
    { cache: "no-store" },
    CTA_FETCH_TIMEOUT_MS,
    1,
  );

  if (!response.ok) {
    throw new Error(`CTA Bus Tracker request failed (${response.status}).`);
  }

  return response.json();
}

function chunk(values, size) {
  const batches = [];
  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }
  return batches;
}

async function fetchCtaBusRoutes(apiKey) {
  const payload = await fetchCtaBusJson("getroutes", apiKey);
  const routes = asArray(payload?.["bustime-response"]?.routes);
  return routes
    .map((route) => route.rt)
    .filter((routeId) => typeof routeId === "string" && routeId.length > 0);
}

async function fetchCtaBusVehicles(apiKey, bounds, routeIds) {
  const batches = chunk(routeIds, CTA_ROUTE_BATCH_SIZE);
  const vehicles = [];

  for (const batch of batches) {
    const payload = await fetchCtaBusJson("getvehicles", apiKey, {
      rt: batch.join(","),
      tmres: "s",
    });
    vehicles.push(...normalizeCtaBusVehicles(payload, bounds));
  }

  return vehicles;
}

async function fetchCtaTrainVehicles(apiKey, bounds) {
  const url = new URL(CTA_TRAIN_POSITIONS_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("rt", CTA_TRAIN_ROUTES.join(","));
  url.searchParams.set("outputType", "JSON");

  const response = await fetchWithTimeoutAndRetry(
    url.toString(),
    { cache: "no-store" },
    CTA_FETCH_TIMEOUT_MS,
    1,
  );

  if (!response.ok) {
    throw new Error(`CTA Train Tracker request failed (${response.status}).`);
  }

  const payload = await response.json();
  return normalizeCtaTrainVehicles(payload, bounds);
}

export async function fetchCtaVehicles({
  busApiKey,
  trainApiKey,
  bounds,
  routeCache,
}) {
  const requests = [];

  if (busApiKey) {
    requests.push(
      (async () => {
        let routeIds = routeCache?.get("chicago-bus-routes");
        if (!routeIds) {
          routeIds = await fetchCtaBusRoutes(busApiKey);
          routeCache?.set("chicago-bus-routes", routeIds);
        }
        return fetchCtaBusVehicles(busApiKey, bounds, routeIds);
      })(),
    );
  }

  if (trainApiKey) {
    requests.push(fetchCtaTrainVehicles(trainApiKey, bounds));
  }

  const batches = await Promise.all(requests);
  return batches.flat();
}
