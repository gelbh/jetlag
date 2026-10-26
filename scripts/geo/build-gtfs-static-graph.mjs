#!/usr/bin/env node
/**
 * Builds compact GTFS route graphs for configured metros.
 * Requires TRANSITLAND_API_KEY for live downloads; --fixtures-only skips network.
 *
 * Optional (no API key): repeatable --local-zip with --metro <id>.
 *   node scripts/geo/build-gtfs-static-graph.mjs --metro dublin \
 *     --local-zip /tmp/GTFS_Dublin_Bus.zip --local-zip /tmp/GTFS_GoAhead.zip
 *
 * Run: node scripts/geo/build-gtfs-static-graph.mjs
 *      node scripts/geo/build-gtfs-static-graph.mjs --metro nyc
 */
import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

/** V8 string limit is ~512MiB; BODS regional zips exceed that for stop_times. */
const LARGE_ZIP_BYTES = 40 * 1024 * 1024;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = resolve(ROOT, "public/geo/gtfs");

function stripUtf8Bom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

const METROS = [
  {
    id: "london",
    feedOnestopId: "mdb-tfl-995",
    feedOnestopIds: ["mdb-tfl-995"],
    bbox: { south: 51.28, west: -0.51, north: 51.69, east: 0.33 },
  },
  {
    id: "dublin",
    // Opaque source id for TFI Dublin Bus + Go-Ahead + Luas + Irish Rail merge
    // (Transitland f-small~operators~ie was only ~207 stops).
    feedOnestopId: "tfi-dublin-merged",
    feedOnestopIds: ["tfi-dublin-merged"],
    bbox: { south: 53.22, west: -6.45, north: 53.45, east: -6.05 },
  },
  {
    id: "nyc",
    feedOnestopId: "mta-nyc-subway-bus-merged",
    feedOnestopIds: ["mta-nyc-subway-bus-merged"],
    bbox: { south: 40.49, west: -74.26, north: 40.92, east: -73.7 },
  },
  {
    id: "sf",
    feedOnestopId: "mdb-sfmta-2886",
    feedOnestopIds: ["mdb-sfmta-2886"],
    bbox: { south: 37.45, west: -122.52, north: 38.05, east: -122.05 },
  },
  {
    id: "chicago",
    feedOnestopId: "cta-google-transit",
    feedOnestopIds: ["cta-google-transit"],
    bbox: { south: 41.64, west: -87.94, north: 42.07, east: -87.52 },
  },
  {
    id: "portland-maine",
    feedOnestopId: "mdb-gpmetro-south-portland",
    feedOnestopIds: ["mdb-gpmetro-south-portland"],
    bbox: { south: 43.55, west: -70.45, north: 43.75, east: -70.1 },
  },
  {
    id: "prince-rupert",
    feedOnestopId: "f-bctransit~prince~rupert",
    feedOnestopIds: ["f-bctransit~prince~rupert"],
    bbox: { south: 54.25, west: -130.45, north: 54.4, east: -130.2 },
  },
  {
    id: "southampton",
    feedOnestopId: "f-bus~dft~gov~uk",
    feedOnestopIds: ["f-bus~dft~gov~uk"],
    // City pack bbox (+margin). BODS ITM South East is not a usable source today.
    bbox: { south: 50.84, west: -1.52, north: 51.0, east: -1.28 },
  },
  {
    id: "sydney",
    // Mobility Database mdb-2449 (TfNSW Greater Sydney complete static).
    feedOnestopId: "mdb-2449",
    feedOnestopIds: ["mdb-2449"],
    // Greater Sydney specialty pack AABB (+margin).
    bbox: { south: -34.38, west: 149.97, north: -32.95, east: 151.39 },
  },
];

const FIXTURES = {
  london: {
    stops: [
      { id: "lon:kgx", name: "King's Cross St. Pancras", lat: 51.5308, lng: -0.1238 },
      { id: "lon:eus", name: "Euston", lat: 51.5282, lng: -0.1338 },
    ],
    routes: [{ id: "lon-vic", shortName: "Victoria", longName: "Victoria line", mode: "metro" }],
    stopRouteIds: { "lon:kgx": ["lon-vic"], "lon:eus": ["lon-vic"] },
  },
  dublin: {
    stops: [
      { id: "dub:ocon", name: "O'Connell Street", lat: 53.3494, lng: -6.2602 },
      { id: "dub:heuston", name: "Heuston", lat: 53.3464, lng: -6.2924 },
    ],
    routes: [{ id: "dub-red", shortName: "Red", longName: "Luas Red Line", mode: "tram" }],
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
    routes: [{ id: "sf-j", shortName: "J", longName: "J Church", mode: "metro" }],
    stopRouteIds: { "sf:embarc": ["sf-j"], "sf:mont": ["sf-j"] },
  },
  chicago: {
    stops: [
      { id: "chi:clark", name: "Clark/Lake", lat: 41.8857, lng: -87.6308 },
      { id: "chi:state", name: "State/Lake", lat: 41.8859, lng: -87.6278 },
    ],
    routes: [{ id: "chi-brn", shortName: "Brn", longName: "Brown Line", mode: "metro" }],
    stopRouteIds: { "chi:clark": ["chi-brn"], "chi:state": ["chi-brn"] },
  },
  "portland-maine": {
    stops: [
      { id: "pme:congress", name: "Congress St + Elm St", lat: 43.6538, lng: -70.2647 },
      { id: "pme:forest", name: "Forest Ave + Woodfords St", lat: 43.6672, lng: -70.2789 },
    ],
    routes: [{ id: "pme-1", shortName: "1", longName: "Congress Street", mode: "bus" }],
    stopRouteIds: { "pme:congress": ["pme-1"], "pme:forest": ["pme-1"] },
  },
  "prince-rupert": {
    stops: [
      { id: "pru:city-hall", name: "City Hall", lat: 54.3158, lng: -130.3209 },
      { id: "pru:cow-bay", name: "Cow Bay", lat: 54.3185, lng: -130.307 },
    ],
    routes: [{ id: "pru-1", shortName: "1", longName: "Downtown", mode: "bus" }],
    stopRouteIds: { "pru:city-hall": ["pru-1"], "pru:cow-bay": ["pru-1"] },
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

/**
 * Basic GTFS route_type (0–7) plus Google extended ranges used by feeds like TfNSW.
 * @see https://developers.google.com/transit/gtfs/reference/extended-route-types
 */
function routeMode(routeType) {
  const raw = String(routeType ?? "").trim();
  switch (raw) {
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
    case "7":
      return "funicular";
    default:
      break;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return "other";
  }
  // Extended route types (HVT / Google):
  if (n >= 100 && n <= 199) {
    return "rail";
  }
  if (n >= 200 && n <= 299) {
    return "bus";
  }
  if (n >= 400 && n <= 499) {
    return "metro";
  }
  if (n >= 700 && n <= 899) {
    return "bus";
  }
  if (n >= 900 && n <= 999) {
    return "tram";
  }
  if ((n >= 1000 && n <= 1099) || (n >= 1200 && n <= 1299)) {
    return "ferry";
  }
  if (n >= 1400 && n <= 1499) {
    return "funicular";
  }
  return "other";
}

function stopInBbox(stop, bbox) {
  const lat = Number(stop.stop_lat);
  const lng = Number(stop.stop_lon);
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

/**
 * Prefer parent stations when children reference them in-bbox.
 * Platform/bay leaves with a present parent are dropped; orphan leaves stay.
 */
function stationStopRows(stopsRows) {
  const byId = new Map(stopsRows.map((row) => [row.stop_id, row]));
  const parentIds = new Set();
  for (const row of stopsRows) {
    if (row.parent_station) {
      parentIds.add(row.parent_station);
    }
    if (row.location_type === "1") {
      parentIds.add(row.stop_id);
    }
  }
  return stopsRows.filter((row) => {
    if (parentIds.has(row.stop_id)) {
      return true;
    }
    if (row.parent_station && byId.has(row.parent_station)) {
      return false;
    }
    return true;
  });
}

/** Remap leaf stop_times routes onto parent station ids when the parent is in-bbox. */
function collapseStopRouteIdsToParents(stopRouteIds, stopsRows) {
  const byId = new Map(stopsRows.map((row) => [row.stop_id, row]));
  const collapsed = {};
  for (const [stopId, routeIds] of Object.entries(stopRouteIds)) {
    const row = byId.get(stopId);
    const targetId =
      row?.parent_station && byId.has(row.parent_station) ? row.parent_station : stopId;
    const merged = new Set(collapsed[targetId] ?? []);
    for (const routeId of routeIds) {
      merged.add(routeId);
    }
    collapsed[targetId] = [...merged];
  }
  return collapsed;
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

function finalizeStopRouteIds(routeSets) {
  const stopRouteIds = {};
  for (const [stopId, routeSet] of routeSets) {
    stopRouteIds[stopId] = [...routeSet];
  }
  return stopRouteIds;
}

function accumulateStopRouteRow(values, columns, state, stopIds, tripRoute) {
  if (state.tripIndex === undefined) {
    state.tripIndex = columns.trip_id;
    state.stopIndex = columns.stop_id;
    if (state.tripIndex === undefined || state.stopIndex === undefined) {
      throw new Error("GTFS stop_times.txt is missing trip_id or stop_id columns.");
    }
  }

  const stopId = values[state.stopIndex];
  if (!stopIds.has(stopId)) {
    return;
  }

  const routeId = tripRoute.get(values[state.tripIndex]);
  if (!routeId) {
    return;
  }

  let routeSet = state.routeSets.get(stopId);
  if (!routeSet) {
    routeSet = new Set();
    state.routeSets.set(stopId, routeSet);
  }
  routeSet.add(routeId);
}

function buildStopRouteIdsFromText(stopTimesText, stopIds, tripRoute) {
  const state = { routeSets: new Map() };
  forEachCsvDataRow(stopTimesText, (values, columns) => {
    accumulateStopRouteRow(values, columns, state, stopIds, tripRoute);
  });
  return finalizeStopRouteIds(state.routeSets);
}

async function buildStopRouteIdsFromUnzipStream(zipPath, stopIds, tripRoute) {
  const child = spawn("unzip", ["-p", zipPath, "stop_times.txt"], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  const state = { routeSets: new Map() };
  let columns = null;

  for await (const rawLine of lines) {
    const line = columns ? rawLine : stripUtf8Bom(rawLine);
    if (!line) {
      continue;
    }
    if (!columns) {
      columns = csvColumnIndexes(splitCsvLine(line));
      continue;
    }
    accumulateStopRouteRow(splitCsvLine(line), columns, state, stopIds, tripRoute);
  }

  const exitCode = await new Promise((resolveExit, rejectExit) => {
    child.on("error", rejectExit);
    child.on("close", resolveExit);
  });
  if (exitCode !== 0) {
    throw new Error(`unzip -p stop_times.txt failed (exit ${exitCode})`);
  }
  return finalizeStopRouteIds(state.routeSets);
}

function unzipEntryTextSync(zipPath, entryName, { maxBuffer = 200 * 1024 * 1024 } = {}) {
  return stripUtf8Bom(
    execFileSync("unzip", ["-p", zipPath, entryName], {
      encoding: "utf8",
      maxBuffer,
    }),
  );
}

function materializeZipPath(zipBuffer, zipPath) {
  if (zipPath) {
    return { path: zipPath, cleanup: null };
  }
  const dir = mkdtempSync(join(tmpdir(), "gtfs-build-"));
  const path = join(dir, "feed.zip");
  writeFileSync(path, Buffer.from(zipBuffer));
  return {
    path,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

async function buildBundleFromGtfsZip(zipBuffer, metro, { zipPath = null } = {}) {
  const byteLength = zipPath
    ? statSync(zipPath).size
    : (zipBuffer?.byteLength ?? zipBuffer?.length ?? 0);
  const useUnzip = Boolean(zipPath) || byteLength >= LARGE_ZIP_BYTES;
  const materialized = useUnzip ? materializeZipPath(zipBuffer, zipPath) : null;

  try {
    let stopsText;
    let routesText;
    let tripsText;
    let stopRouteIds;

    if (materialized) {
      stopsText = unzipEntryTextSync(materialized.path, "stops.txt");
      routesText = unzipEntryTextSync(materialized.path, "routes.txt");
      tripsText = unzipEntryTextSync(materialized.path, "trips.txt", {
        maxBuffer: 400 * 1024 * 1024,
      });
      if (!stopsText || !routesText || !tripsText) {
        throw new Error(`GTFS zip for ${metro.id} is missing required tables.`);
      }

      const stopsRows = parseCsv(stopsText).filter((row) => stopInBbox(row, metro.bbox));
      const referencedParentIds = new Set(
        stopsRows.map((row) => row.parent_station).filter((value) => value && value.length > 0),
      );
      const tripsRows = parseCsv(tripsText);
      // stop_times usually cite platform leaves; scan those, then collapse onto parents.
      const stopIds = new Set(
        stopsRows.filter((row) => !referencedParentIds.has(row.stop_id)).map((row) => row.stop_id),
      );
      const tripRoute = new Map(tripsRows.map((row) => [row.trip_id, row.route_id]));
      stopRouteIds = collapseStopRouteIdsToParents(
        await buildStopRouteIdsFromUnzipStream(materialized.path, stopIds, tripRoute),
        stopsRows,
      );

      const usedRouteIds = new Set(Object.values(stopRouteIds).flatMap((routeIds) => routeIds));
      const routesRows = parseCsv(routesText).filter((row) => usedRouteIds.has(row.route_id));
      const routes = routesRows.map((row) => ({
        id: row.route_id,
        shortName: row.route_short_name || row.route_id,
        longName: row.route_long_name || row.route_short_name || row.route_id,
        mode: routeMode(row.route_type),
      }));
      const stops = stationStopRows(stopsRows).map((row) => ({
        id: row.stop_id,
        name: row.stop_name,
        lat: Number(row.stop_lat),
        lng: Number(row.stop_lon),
        ...(row.parent_station && !referencedParentIds.has(row.stop_id)
          ? { parentStationId: row.parent_station }
          : {}),
      }));

      return {
        metroId: metro.id,
        feedOnestopId: metro.feedOnestopId,
        builtAt: new Date().toISOString(),
        stops,
        routes,
        stopRouteIds,
      };
    }

    const zip = new JSZip();
    const archive = await zip.loadAsync(zipBuffer);
    stopsText = stripUtf8Bom((await archive.file("stops.txt")?.async("string")) ?? "");
    routesText = stripUtf8Bom((await archive.file("routes.txt")?.async("string")) ?? "");
    tripsText = stripUtf8Bom((await archive.file("trips.txt")?.async("string")) ?? "");
    const stopTimesText = stripUtf8Bom(
      (await archive.file("stop_times.txt")?.async("string")) ?? "",
    );

    if (!stopsText || !routesText || !tripsText || !stopTimesText) {
      throw new Error(`GTFS zip for ${metro.id} is missing required tables.`);
    }

    const stopsRows = parseCsv(stopsText).filter((row) => stopInBbox(row, metro.bbox));
    const referencedParentIds = new Set(
      stopsRows.map((row) => row.parent_station).filter((value) => value && value.length > 0),
    );
    const tripsRows = parseCsv(tripsText);

    const stopIds = new Set(
      stopsRows.filter((row) => !referencedParentIds.has(row.stop_id)).map((row) => row.stop_id),
    );
    const tripRoute = new Map(tripsRows.map((row) => [row.trip_id, row.route_id]));
    stopRouteIds = collapseStopRouteIdsToParents(
      buildStopRouteIdsFromText(stopTimesText, stopIds, tripRoute),
      stopsRows,
    );

    const usedRouteIds = new Set(Object.values(stopRouteIds).flatMap((routeIds) => routeIds));
    const routesRows = parseCsv(routesText).filter((row) => usedRouteIds.has(row.route_id));

    const routes = routesRows.map((row) => ({
      id: row.route_id,
      shortName: row.route_short_name || row.route_id,
      longName: row.route_long_name || row.route_short_name || row.route_id,
      mode: routeMode(row.route_type),
    }));

    const stops = stationStopRows(stopsRows).map((row) => ({
      id: row.stop_id,
      name: row.stop_name,
      lat: Number(row.stop_lat),
      lng: Number(row.stop_lon),
      ...(row.parent_station && !referencedParentIds.has(row.stop_id)
        ? { parentStationId: row.parent_station }
        : {}),
    }));

    return {
      metroId: metro.id,
      feedOnestopId: metro.feedOnestopId,
      builtAt: new Date().toISOString(),
      stops,
      routes,
      stopRouteIds,
    };
  } finally {
    materialized?.cleanup?.();
  }
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
          parentStationId: stopIdMap.get(stop.parentStationId) ?? `${slug}:${stop.parentStationId}`,
        }
      : {}),
  }));

  const routes = bundle.routes.map((route) => ({
    ...route,
    id: routeIdMap.get(route.id),
  }));

  const stopRouteIds = {};
  for (const [stopId, routeIds] of Object.entries(bundle.stopRouteIds)) {
    stopRouteIds[stopIdMap.get(stopId)] = routeIds.map((routeId) => routeIdMap.get(routeId));
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
    throw new Error(`Transitland download failed for ${feedId} (${response.status}).`);
  }

  return response.arrayBuffer();
}

async function downloadGtfsBundle(metro, apiKey) {
  const feedIds = metro.feedOnestopIds ?? [metro.feedOnestopId];
  const parts = [];

  for (const feedId of feedIds) {
    const buffer = await downloadGtfsZip(feedId, apiKey);
    const bundle = await buildBundleFromGtfsZip(buffer, metro);
    parts.push(feedIds.length > 1 ? namespaceBundlePart(bundle, feedId) : bundle);
    console.log(`  ${feedId}: ${bundle.stops.length} stops, ${bundle.routes.length} routes.`);
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

function collectLocalZipPaths(args) {
  const paths = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--local-zip") {
      continue;
    }
    const zipPath = args[index + 1];
    if (!zipPath || zipPath.startsWith("--")) {
      throw new Error("--local-zip requires a path argument.");
    }
    paths.push(zipPath);
    index += 1;
  }
  return paths;
}

function loadExistingManifest() {
  const manifestPath = resolve(OUT_DIR, "manifest.json");
  if (!existsSync(manifestPath)) {
    return { metros: [] };
  }
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function upsertManifestEntries(entries, { replaceAll }) {
  const manifestPath = resolve(OUT_DIR, "manifest.json");
  const manifest = replaceAll ? { metros: [] } : loadExistingManifest();
  const byId = new Map(manifest.metros.map((entry) => [entry.id, entry]));
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }
  manifest.metros = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${manifestPath} (${manifest.metros.length} metros).`);
}

async function buildBundleFromLocalZips(metro, localZipPaths) {
  const parts = [];
  for (const zipPath of localZipPaths) {
    // Prefer path-based unzip for large BODS/agency zips (avoid V8 string limit).
    const zipBuffer = statSync(zipPath).size >= LARGE_ZIP_BYTES ? null : readFileSync(zipPath);
    const part = await buildBundleFromGtfsZip(zipBuffer, metro, { zipPath });
    const slug = basename(zipPath, ".zip");
    parts.push(localZipPaths.length > 1 ? namespaceBundlePart(part, slug) : part);
    console.log(`  ${slug}: ${part.stops.length} stops, ${part.routes.length} routes.`);
  }
  const merged = mergeBundleParts(parts);
  return {
    metroId: metro.id,
    feedOnestopId: metro.feedOnestopId,
    builtAt: new Date().toISOString(),
    ...merged,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const fixturesOnly = args.includes("--fixtures-only");
  const metroArgIndex = args.indexOf("--metro");
  const metroFilter = metroArgIndex >= 0 ? args[metroArgIndex + 1] : null;
  const localZipPaths = collectLocalZipPaths(args);
  const apiKey = process.env.TRANSITLAND_API_KEY?.trim();

  if (localZipPaths.length > 0 && !metroFilter) {
    console.error("Error: --local-zip requires --metro <id> so only one bundle is written.");
    process.exit(1);
  }

  const metros = METROS.filter((metro) => (metroFilter ? metro.id === metroFilter : true));

  const manifestEntries = [];
  const patchManifestOnly = Boolean(metroFilter) || localZipPaths.length > 0 || fixturesOnly;

  for (const metro of metros) {
    let bundle;
    const outPath = resolve(OUT_DIR, `${metro.id}.json`);

    if (localZipPaths.length > 0) {
      bundle = await buildBundleFromLocalZips(metro, localZipPaths);
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
        `Wrote ${outPath} from ${localZipPaths.length} local zip(s) (${bundle.stops.length} stops, ${bundle.routes.length} routes).`,
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

  upsertManifestEntries(manifestEntries, { replaceAll: !patchManifestOnly });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
