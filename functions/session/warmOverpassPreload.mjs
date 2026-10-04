import { fetchCachedOverpassQuery } from "../proxies/overpassProxyCore.mjs";

const WARM_PRELOAD_MEASURING_SELECTORS = [
  { category: "park", selectors: ['["leisure"="park"]', '["boundary"="national_park"]'] },
  { category: "museum", selectors: ['["tourism"="museum"]', '["amenity"="museum"]'] },
  { category: "hospital", selectors: ['["amenity"="hospital"]'] },
];

const METERS_PER_DEGREE_LAT = 111_320;
const GEOM_WARM_MIN_AABB_KM2 = 100;

function boundingBoxAreaKm2({ south, west, north, east }) {
  const midLat = (north + south) / 2;
  const latMeters = (north - south) * METERS_PER_DEGREE_LAT;
  const lngMeters = (east - west) * METERS_PER_DEGREE_LAT * Math.cos((midLat * Math.PI) / 180);
  return Math.max((latMeters * lngMeters) / 1_000_000, 0);
}

function formatBbox({ south, west, north, east }) {
  return `${south},${west},${north},${east}`;
}

function parseGameAreaBounds(gameArea) {
  if (!gameArea || typeof gameArea !== "object") {
    return null;
  }

  const { south, west, north, east } = gameArea;
  if (
    !Number.isFinite(south) ||
    !Number.isFinite(west) ||
    !Number.isFinite(north) ||
    !Number.isFinite(east)
  ) {
    return null;
  }

  return { south, west, north, east };
}

export function buildCoastlineWarmQuery(bounds) {
  const bbox = formatBbox(bounds);

  return `
    [out:json][timeout:25];
    way["natural"="coastline"](${bbox});
    out geom;
  `;
}

export function buildLandmassWarmQuery(bounds) {
  const bbox = formatBbox(bounds);

  return `
    [out:json][timeout:25];
    (
      way["natural"="water"](${bbox});
      way["waterway"~"^(river|canal|dock)$"](${bbox});
      relation["place"~"^(island|islet)$"]["name"](${bbox});
    );
    out geom;
  `;
}

export function buildMeasuringWarmQuery(bounds, selectors) {
  const bbox = formatBbox(bounds);
  const clauses = selectors.flatMap((selector) => [
    `node${selector}(${bbox});`,
    `way${selector}(${bbox});`,
    `relation${selector}(${bbox});`,
  ]);

  return `
    [out:json][timeout:25];
    (
      ${clauses.join("\n      ")}
    );
    out center 200;
  `;
}

export function buildWarmPreloadQueries(gameArea) {
  const bounds = parseGameAreaBounds(gameArea);
  if (!bounds) {
    return [];
  }

  const measuringQueries = WARM_PRELOAD_MEASURING_SELECTORS.map((entry) =>
    buildMeasuringWarmQuery(bounds, entry.selectors),
  );

  if (boundingBoxAreaKm2(bounds) >= GEOM_WARM_MIN_AABB_KM2) {
    return measuringQueries;
  }

  return [buildCoastlineWarmQuery(bounds), buildLandmassWarmQuery(bounds), ...measuringQueries];
}

export async function warmOverpassPreloadForGameArea(gameArea) {
  const queries = buildWarmPreloadQueries(gameArea);
  let warmed = 0;

  for (const query of queries) {
    try {
      await fetchCachedOverpassQuery(query, "premium");
      warmed += 1;
    } catch {
      // warm preload is best-effort
    }
  }

  return { warmed, total: queries.length };
}

export async function handleSessionWarmPreloadWrite(event) {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();

  if (!after?.gameArea || after.tier !== "premium") {
    return { warmed: 0, total: 0, skipped: true };
  }

  const beforeGameAreaJson = JSON.stringify(before?.gameArea ?? null);
  const afterGameAreaJson = JSON.stringify(after.gameArea);
  if (beforeGameAreaJson === afterGameAreaJson) {
    return { warmed: 0, total: 0, skipped: true };
  }

  return warmOverpassPreloadForGameArea(after.gameArea);
}
