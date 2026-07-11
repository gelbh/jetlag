#!/usr/bin/env node
/**
 * Builds compact GTFS route graphs for configured metros.
 * Requires TRANSITLAND_API_KEY for live downloads; --fixtures-only skips network.
 *
 * Optional: --local-zip /path/to/gtfs.zip with --metro portland-maine when no API key.
 *
 * Run: node scripts/build-gtfs-static-graph.mjs
 *      node scripts/build-gtfs-static-graph.mjs --metro nyc
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "public/geo/gtfs");

const METROS = [
  {
    id: "london",
    feedOnestopId: "f-transport~for~london",
    feedOnestopIds: ["f-transport~for~london"],
    bbox: { south: 51.28, west: -0.51, north: 51.69, east: 0.33 },
  },
  {
    id: "dublin",
    feedOnestopId: "f-small~operators~ie",
    feedOnestopIds: ["f-small~operators~ie"],
    bbox: { south: 53.22, west: -6.45, north: 53.45, east: -6.05 },
  },
  {
    id: "nyc",
    feedOnestopId: "f-dr5r-nyctsubway",
    feedOnestopIds: ["f-dr5r-nyctsubway", "f-dr5r-path~nj~us"],
    bbox: { south: 40.49, west: -74.26, north: 40.92, east: -73.7 },
  },
  {
    id: "sf",
    feedOnestopId: "f-9q8y-sfmta",
    feedOnestopIds: ["f-9q8y-sfmta"],
    bbox: { south: 37.45, west: -122.52, north: 38.05, east: -122.05 },
  },
  {
    id: "chicago",
    feedOnestopId: "f-dp3-cta",
    feedOnestopIds: ["f-dp3-cta"],
    bbox: { south: 41.64, west: -87.94, north: 42.07, east: -87.52 },
  },
  {
    id: "portland-maine",
    feedOnestopId: "f-dry0-maine~greaterportlandmetrobus",
    feedOnestopIds: ["f-dry0-maine~greaterportlandmetrobus"],
    bbox: { south: 43.55, west: -70.45, north: 43.75, east: -70.1 },
  },
];

const FIXTURES = {
  london: {
    stops: [
      { id: "lon:kgx", name: "King's Cross St. Pancras", lat: 51.5308, lng: -0.1238 },
      { id: "lon:eus", name: "Euston", lat: 51.5282, lng: -0.1338 },
    ],
    routes: [
      { id: "lon-vic", shortName: "Victoria", longName: "Victoria line", mode: "metro" },
    ],
    stopRouteIds: { "lon:kgx": ["lon-vic"], "lon:eus": ["lon-vic"] },
  },
  dublin: {
    stops: [
      { id: "dub:ocon", name: "O'Connell Street", lat: 53.3494, lng: -6.2602 },
      { id: "dub:heuston", name: "Heuston", lat: 53.3464, lng: -6.2924 },
    ],
    routes: [
      { id: "dub-red", shortName: "Red", longName: "Luas Red Line", mode: "tram" },
    ],
    stopRouteIds: { "dub:ocon": ["dub-red"], "dub:heuston": ["dub-red"] },
  },
  nyc: {
    stops: [
      { id: "nyc:penn", name: "34 St-Penn Station", lat: 40.7506, lng: -73.9935 },
      { id: "nyc:times", name: "Times Sq-42 St", lat: 40.7559, lng: -73.9872 },
      { id: "nyc:grand", name: "Grand Central-42 St", lat: 40.7527, lng: -73.9772 },
      { id: "nyc:union", name: "14 St-Union Sq", lat: 40.7347, lng: -73.9897 },
      {
        id: "nyc:union-n",
        name: "14 St-Union Sq (North)",
        lat: 40.7355,
        lng: -73.9904,
        parentStationId: "nyc:union",
      },
    ],
    routes: [
      { id: "route-1", shortName: "1", longName: "Broadway-7 Av Local", mode: "metro" },
      { id: "route-4", shortName: "4", longName: "Lexington Av Express", mode: "metro" },
      { id: "route-l", shortName: "L", longName: "14 St-Canarsie Local", mode: "metro" },
    ],
    stopRouteIds: {
      "nyc:penn": ["route-1"],
      "nyc:times": ["route-1", "route-l"],
      "nyc:grand": ["route-4"],
      "nyc:union": ["route-l"],
      "nyc:union-n": ["route-l"],
    },
  },
  sf: {
    stops: [
      { id: "sf:embarc", name: "Embarcadero", lat: 37.7929, lng: -122.3969 },
      { id: "sf:mont", name: "Montgomery St", lat: 37.7894, lng: -122.4012 },
    ],
    routes: [
      { id: "sf-j", shortName: "J", longName: "J Church", mode: "metro" },
    ],
    stopRouteIds: { "sf:embarc": ["sf-j"], "sf:mont": ["sf-j"] },
  },
  chicago: {
    stops: [
      { id: "chi:clark", name: "Clark/Lake", lat: 41.8857, lng: -87.6308 },
      { id: "chi:state", name: "State/Lake", lat: 41.8859, lng: -87.6278 },
    ],
    routes: [
      { id: "chi-brn", shortName: "Brn", longName: "Brown Line", mode: "metro" },
    ],
    stopRouteIds: { "chi:clark": ["chi-brn"], "chi:state": ["chi-brn"] },
  },
  "portland-maine": {
    stops: [
      { id: "pme:congress", name: "Congress St + Elm St", lat: 43.6538, lng: -70.2647 },
      { id: "pme:forest", name: "Forest Ave + Woodfords St", lat: 43.6672, lng: -70.2789 },
    ],
    routes: [
      { id: "pme-1", shortName: "1", longName: "Congress Street", mode: "bus" },
    ],
    stopRouteIds: { "pme:congress": ["pme-1"], "pme:forest": ["pme-1"] },
  },
};

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    for (let index = 0; index < headers.length; index += 1) {
      row[headers[index]] = values[index] ?? "";
    }
    return row;
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function routeMode(routeType) {
  switch (routeType) {
    case "0":
    case "5":
    case "6":
      return "tram";
    case "1":
      return "metro";
    case "2":
      return "rail";
    case "3":
      return "bus";
    case "4":
      return "ferry";
    default:
      return "other";
  }
}

function stopInBbox(stop, bbox) {
  const lat = Number(stop.stop_lat);
  const lng = Number(stop.stop_lon);
  return (
    lat >= bbox.south &&
    lat <= bbox.north &&
    lng >= bbox.west &&
    lng <= bbox.east
  );
}

function csvColumnIndexes(headers) {
  const indexes = {};
  for (let index = 0; index < headers.length; index += 1) {
    indexes[headers[index]] = index;
  }
  return indexes;
}

function forEachCsvDataRow(text, onRow) {
  let lineStart = 0;
  let columns = null;

  for (let index = 0; index <= text.length; index += 1) {
    if (index < text.length && text[index] !== "\n") {
      continue;
    }

    let lineEnd = index;
    if (lineEnd > lineStart && text[lineEnd - 1] === "\r") {
      lineEnd -= 1;
    }

    if (lineEnd > lineStart) {
      const line = text.slice(lineStart, lineEnd);
      if (!columns) {
        columns = csvColumnIndexes(splitCsvLine(line));
      } else {
        onRow(splitCsvLine(line), columns);
      }
    }

    lineStart = index + 1;
  }
}

function buildStopRouteIdsFromText(stopTimesText, stopIds, tripRoute) {
  let tripIndex;
  let stopIndex;
  const routeSets = new Map();

  forEachCsvDataRow(stopTimesText, (values, columns) => {
    if (tripIndex === undefined) {
      tripIndex = columns.trip_id;
      stopIndex = columns.stop_id;
      if (tripIndex === undefined || stopIndex === undefined) {
        throw new Error("GTFS stop_times.txt is missing trip_id or stop_id columns.");
      }
    }

    const stopId = values[stopIndex];
    if (!stopIds.has(stopId)) {
      return;
    }

    const routeId = tripRoute.get(values[tripIndex]);
    if (!routeId) {
      return;
    }

    let routeSet = routeSets.get(stopId);
    if (!routeSet) {
      routeSet = new Set();
      routeSets.set(stopId, routeSet);
    }
    routeSet.add(routeId);
  });

  const stopRouteIds = {};
  for (const [stopId, routeSet] of routeSets) {
    stopRouteIds[stopId] = [...routeSet];
  }
  return stopRouteIds;
}

function buildBundleFromGtfsZip(zipBuffer, metro) {
  const zip = new JSZip();
  return zip.loadAsync(zipBuffer).then(async (archive) => {
    const stopsText = await archive.file("stops.txt")?.async("string");
    const routesText = await archive.file("routes.txt")?.async("string");
    const tripsText = await archive.file("trips.txt")?.async("string");
    const stopTimesText = await archive.file("stop_times.txt")?.async("string");

    if (!stopsText || !routesText || !tripsText || !stopTimesText) {
      throw new Error(`GTFS zip for ${metro.id} is missing required tables.`);
    }

    const stopsRows = parseCsv(stopsText).filter((row) => stopInBbox(row, metro.bbox));
    const referencedParentIds = new Set(
      stopsRows
        .map((row) => row.parent_station)
        .filter((value) => value && value.length > 0),
    );
    const tripsRows = parseCsv(tripsText);

    const stopIds = new Set(
      stopsRows
        .filter((row) => !referencedParentIds.has(row.stop_id))
        .map((row) => row.stop_id),
    );
    const tripRoute = new Map(
      tripsRows.map((row) => [row.trip_id, row.route_id]),
    );
    const stopRouteIds = buildStopRouteIdsFromText(
      stopTimesText,
      stopIds,
      tripRoute,
    );

    const usedRouteIds = new Set(
      Object.values(stopRouteIds).flatMap((routeIds) => routeIds),
    );
    const routesRows = parseCsv(routesText).filter((row) =>
      usedRouteIds.has(row.route_id),
    );

    const routes = routesRows.map((row) => ({
      id: row.route_id,
      shortName: row.route_short_name || row.route_id,
      longName: row.route_long_name || row.route_short_name || row.route_id,
      mode: routeMode(row.route_type),
    }));

    const stops = stopsRows
      .filter((row) => !referencedParentIds.has(row.stop_id))
      .map((row) => ({
      id: row.stop_id,
      name: row.stop_name,
      lat: Number(row.stop_lat),
      lng: Number(row.stop_lon),
      ...(row.parent_station ? { parentStationId: row.parent_station } : {}),
    }));

    return {
      metroId: metro.id,
      feedOnestopId: metro.feedOnestopId,
      builtAt: new Date().toISOString(),
      stops,
      routes,
      stopRouteIds,
    };
  });
}

function feedSlug(feedId) {
  return feedId.replace(/^f-/, "").replace(/~/g, "_");
}

function namespaceBundlePart(bundle, feedId) {
  const slug = feedSlug(feedId);
  const stopIdMap = new Map();
  const routeIdMap = new Map();

  for (const stop of bundle.stops) {
    stopIdMap.set(stop.id, `${slug}:${stop.id}`);
  }
  for (const route of bundle.routes) {
    routeIdMap.set(route.id, `${slug}:${route.id}`);
  }

  const stops = bundle.stops.map((stop) => ({
    ...stop,
    id: stopIdMap.get(stop.id),
    ...(stop.parentStationId
      ? {
          parentStationId:
            stopIdMap.get(stop.parentStationId) ??
            `${slug}:${stop.parentStationId}`,
        }
      : {}),
  }));

  const routes = bundle.routes.map((route) => ({
    ...route,
    id: routeIdMap.get(route.id),
  }));

  const stopRouteIds = {};
  for (const [stopId, routeIds] of Object.entries(bundle.stopRouteIds)) {
    stopRouteIds[stopIdMap.get(stopId)] = routeIds.map(
      (routeId) => routeIdMap.get(routeId),
    );
  }

  return { stops, routes, stopRouteIds };
}

function mergeBundleParts(parts) {
  return {
    stops: parts.flatMap((part) => part.stops),
    routes: parts.flatMap((part) => part.routes),
    stopRouteIds: Object.assign({}, ...parts.map((part) => part.stopRouteIds)),
  };
}

async function downloadGtfsZip(feedId, apiKey) {
  const url = `https://transit.land/api/v2/rest/feeds/${encodeURIComponent(feedId)}/download_latest_feed_version?apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Transitland download failed for ${feedId} (${response.status}).`,
    );
  }

  return response.arrayBuffer();
}

async function downloadGtfsBundle(metro, apiKey) {
  const feedIds = metro.feedOnestopIds ?? [metro.feedOnestopId];
  const parts = [];

  for (const feedId of feedIds) {
    const buffer = await downloadGtfsZip(feedId, apiKey);
    const bundle = await buildBundleFromGtfsZip(buffer, metro);
    parts.push(
      feedIds.length > 1 ? namespaceBundlePart(bundle, feedId) : bundle,
    );
    console.log(
      `  ${feedId}: ${bundle.stops.length} stops, ${bundle.routes.length} routes.`,
    );
  }

  const merged = mergeBundleParts(parts);
  return {
    metroId: metro.id,
    feedOnestopId: metro.feedOnestopId,
    builtAt: new Date().toISOString(),
    ...merged,
  };
}

function writeBundle(path, bundle) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(bundle)}\n`, "utf8");
}

function buildFixtureBundle(metro) {
  const fixture = FIXTURES[metro.id];
  if (!fixture) {
    return null;
  }

  return {
    metroId: metro.id,
    feedOnestopId: metro.feedOnestopId,
    builtAt: new Date().toISOString(),
    stops: fixture.stops,
    routes: fixture.routes,
    stopRouteIds: fixture.stopRouteIds,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const fixturesOnly = args.includes("--fixtures-only");
  const metroArgIndex = args.indexOf("--metro");
  const metroFilter =
    metroArgIndex >= 0 ? args[metroArgIndex + 1] : null;
  const localZipIndex = args.indexOf("--local-zip");
  const localZipPath =
    localZipIndex >= 0 ? args[localZipIndex + 1] : null;
  const apiKey = process.env.TRANSITLAND_API_KEY?.trim();

  if (localZipPath && !metroFilter) {
    console.error(
      "Error: --local-zip requires --metro <id> so only one bundle is written.",
    );
    process.exit(1);
  }

  const metros = METROS.filter((metro) =>
    metroFilter ? metro.id === metroFilter : true,
  );

  const manifestEntries = [];

  for (const metro of metros) {
    let bundle;
    const outPath = resolve(OUT_DIR, `${metro.id}.json`);

    if (localZipPath) {
      const zipBuffer = readFileSync(localZipPath);
      bundle = await buildBundleFromGtfsZip(zipBuffer, metro);
      writeBundle(outPath, bundle);
      manifestEntries.push({
        id: metro.id,
        bundlePath: `/geo/gtfs/${metro.id}.json`,
        feedOnestopId: metro.feedOnestopId,
        builtAt: bundle.builtAt,
        stopCount: bundle.stops.length,
        routeCount: bundle.routes.length,
      });
      console.log(
        `Wrote ${outPath} from ${localZipPath} (${bundle.stops.length} stops, ${bundle.routes.length} routes).`,
      );
      continue;
    }

    if (fixturesOnly || !apiKey) {
      bundle = buildFixtureBundle(metro);
      if (!bundle) {
        console.warn(`Skipping ${metro.id}: no fixture and no API key.`);
        continue;
      }
      const fixturePath = resolve(OUT_DIR, "fixtures", `${metro.id}-mini.json`);
      writeBundle(fixturePath, bundle);
      manifestEntries.push({
        id: metro.id,
        bundlePath: `/geo/gtfs/fixtures/${metro.id}-mini.json`,
        feedOnestopId: metro.feedOnestopId,
        builtAt: bundle.builtAt,
        stopCount: bundle.stops.length,
        routeCount: bundle.routes.length,
      });
      console.log(`Wrote fixture ${fixturePath} (${bundle.stops.length} stops).`);
      continue;
    }

    console.log(`Downloading ${metro.id}...`);
    bundle = await downloadGtfsBundle(metro, apiKey);
    writeBundle(outPath, bundle);
    manifestEntries.push({
      id: metro.id,
      bundlePath: `/geo/gtfs/${metro.id}.json`,
      feedOnestopId: metro.feedOnestopId,
      builtAt: bundle.builtAt,
      stopCount: bundle.stops.length,
      routeCount: bundle.routes.length,
    });
    console.log(`Wrote ${outPath} (${bundle.stops.length} stops, ${bundle.routes.length} routes).`);
  }

  const manifest = { metros: manifestEntries };
  const manifestPath = resolve(OUT_DIR, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${manifestPath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
