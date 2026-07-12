import { fetchWithTimeoutAndRetry } from "../lib/fetchWithTimeout.mjs";

const TRANSITLAND_API_BASE = "https://transit.land/api/v2/rest";
const TRANSIT_FETCH_TIMEOUT_MS = 30_000;

function isInsideBounds(lat, lng, bounds) {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

function normalizeTransitlandVehicles(payload, bounds) {
  const vehicles = [];

  for (const entry of payload.vehicle_positions ?? []) {
    const lat = entry.position?.latitude;
    const lng = entry.position?.longitude;
    if (lat === undefined || lng === undefined) {
      continue;
    }

    if (!isInsideBounds(lat, lng, bounds)) {
      continue;
    }

    vehicles.push({
      id: String(entry.id ?? `${lat},${lng}`),
      label: entry.vehicle?.label ?? entry.trip?.route_id ?? "Vehicle",
      lat,
      lng,
      bearing: entry.position?.bearing,
      routeRef: entry.trip?.route_id,
      mode: "other",
      updatedAt: entry.feed_version?.fetched_at ?? new Date().toISOString(),
    });
  }

  return vehicles;
}

function normalizeGtfsRtVehicleEntities(payload, bounds) {
  const vehicles = [];

  for (const entry of payload.entity ?? []) {
    const lat = entry.vehicle?.position?.latitude;
    const lng = entry.vehicle?.position?.longitude;
    if (lat === undefined || lng === undefined) {
      continue;
    }

    if (!isInsideBounds(lat, lng, bounds)) {
      continue;
    }

    vehicles.push({
      id: String(entry.id ?? `${lat},${lng}`),
      label:
        entry.vehicle?.vehicle?.label ??
        entry.vehicle?.trip?.routeId ??
        "Vehicle",
      lat,
      lng,
      bearing: entry.vehicle?.position?.bearing,
      routeRef: entry.vehicle?.trip?.routeId,
      mode: "other",
      updatedAt: new Date().toISOString(),
    });
  }

  return vehicles;
}

async function fetchTransitlandJson(url, apiKey) {
  const response = await fetchWithTimeoutAndRetry(
    url.toString(),
    {
      cache: "no-store",
      headers: {
        apikey: apiKey,
      },
    },
    TRANSIT_FETCH_TIMEOUT_MS,
    1,
  );

  if (!response.ok) {
    throw new Error(`Transitland request failed (${response.status}).`);
  }

  return response.json();
}

export async function fetchTransitlandVehicles(feed, apiKey, bounds) {
  if (feed.includes("~rt")) {
    const url = new URL(
      `${TRANSITLAND_API_BASE}/feeds/${encodeURIComponent(feed)}/download_latest_rt/vehicle_positions.json`,
    );
    url.searchParams.set("apikey", apiKey);
    const payload = await fetchTransitlandJson(url, apiKey);
    return normalizeGtfsRtVehicleEntities(payload, bounds);
  }

  const url = new URL(`${TRANSITLAND_API_BASE}/vehicle_positions`);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("feed", feed);
  url.searchParams.set(
    "search",
    `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`,
  );
  url.searchParams.set("limit", "200");

  const payload = await fetchTransitlandJson(url, apiKey);
  return normalizeTransitlandVehicles(payload, bounds);
}
