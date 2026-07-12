import { fetchCachedOverpassQuery } from "../proxies/overpassProxyCore.mjs";

const WARM_PRELOAD_MEASURING_SELECTORS = [
  { category: "park", selectors: ['["leisure"="park"]', '["boundary"="national_park"]'] },
  { category: "museum", selectors: ['["tourism"="museum"]', '["amenity"="museum"]'] },
  { category: "hospital", selectors: ['["amenity"="hospital"]'] },
];

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
  const { south, west, north, east } = bounds;

  return `
    [out:json][timeout:45][bbox:${south},${west},${north},${east}];
    area.searchArea;
    (
      way(area.searchArea)["natural"="water"];
      way(area.searchArea)["waterway"~"^(river|canal|stream|ditch|dock)$"];
      relation(area.searchArea)["place"~"^(island|islet)$"]["name"];
    );
    out center;
    >;
    out geom qt;
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

  const queries = [
    buildCoastlineWarmQuery(bounds),
    buildLandmassWarmQuery(bounds),
    ...WARM_PRELOAD_MEASURING_SELECTORS.map((entry) =>
      buildMeasuringWarmQuery(bounds, entry.selectors),
    ),
  ];

  return queries;
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
