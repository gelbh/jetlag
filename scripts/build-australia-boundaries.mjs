/**
 * Convert ABS ASGS STE + LGA GeoJSON (tmp) into public/geo/australia pack assets.
 *
 * Source downloads (not committed): ArcGIS REST GeoJSON with maxAllowableOffset=0.0014
 *   STE: ASGS2021/STE  LGA: ASGS2025/LGA
 * Further client simplify via @turf/simplify to Switzerland-band file weight.
 *
 * Usage:
 *   node scripts/build-australia-boundaries.mjs --raw-dir /tmp/abs-asgs/raw
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import polygonToLine from "@turf/polygon-to-line";
import simplify from "@turf/simplify";
import union from "@turf/union";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "geo", "australia");

const STATE_BY_CODE = {
  1: { id: "nsw", name: "New South Wales" },
  2: { id: "vic", name: "Victoria" },
  3: { id: "qld", name: "Queensland" },
  4: { id: "sa", name: "South Australia" },
  5: { id: "wa", name: "Western Australia" },
  6: { id: "tas", name: "Tasmania" },
  7: { id: "nt", name: "Northern Territory" },
  8: { id: "act", name: "Australian Capital Territory" },
};

const POI_CATEGORIES = [
  "amusement_park",
  "aquarium",
  "body_of_water",
  "commercial_airport",
  "foreign_consulate",
  "golf_course",
  "hospital",
  "library",
  "mountain",
  "movie_theater",
  "museum",
  "park",
  "rail_station",
  "zoo",
];

const SIMPLIFY_TOLERANCE = 0.002;
const ROUND_DECIMALS = 4;

function parseArgs(argv) {
  const args = { rawDir: "/tmp/abs-asgs/raw" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--raw-dir" && argv[i + 1]) {
      args.rawDir = argv[++i];
    }
  }
  return args;
}

function roundCoord(value) {
  const factor = 10 ** ROUND_DECIMALS;
  return Math.round(value * factor) / factor;
}

function roundCoords(coords) {
  if (typeof coords[0] === "number") {
    return [roundCoord(coords[0]), roundCoord(coords[1])];
  }
  return coords.map(roundCoords);
}

function cleanGeometry(geometry) {
  if (!geometry) return null;
  return {
    type: geometry.type,
    coordinates: roundCoords(geometry.coordinates),
  };
}

function simplifyFeature(feature) {
  if (!feature.geometry) return null;
  let geometry = feature.geometry;
  try {
    const simplified = simplify(feature, {
      tolerance: SIMPLIFY_TOLERANCE,
      highQuality: false,
      mutate: false,
    });
    if (simplified?.geometry) {
      geometry = simplified.geometry;
    }
  } catch {
    // Tiny island rings can collapse under simplify; keep server-generalized verts.
  }
  const cleaned = cleanGeometry(geometry);
  if (!cleaned) return null;
  return { type: "Feature", properties: feature.properties, geometry: cleaned };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function loadSte(rawDir) {
  const collection = JSON.parse(readFileSync(join(rawDir, "ste.geojson"), "utf8"));
  const features = [];
  for (const feature of collection.features ?? []) {
    const code = String(feature.properties?.state_code_2021 ?? "");
    const meta = STATE_BY_CODE[code];
    if (!meta || !feature.geometry) continue;
    const next = simplifyFeature({
      type: "Feature",
      properties: { stateId: meta.id, name: meta.name },
      geometry: feature.geometry,
    });
    if (next) features.push(next);
  }
  features.sort((a, b) => a.properties.stateId.localeCompare(b.properties.stateId));
  if (features.length !== 8) {
    throw new Error(`expected 8 STE features, got ${features.length}`);
  }
  return featureCollection(features);
}

function loadLgas(rawDir) {
  /** @type {Record<string, import('@turf/helpers').Feature[]>} */
  const byState = Object.fromEntries(Object.values(STATE_BY_CODE).map((s) => [s.id, []]));
  for (const code of Object.keys(STATE_BY_CODE)) {
    const collection = JSON.parse(readFileSync(join(rawDir, `lga_${code}.geojson`), "utf8"));
    const meta = STATE_BY_CODE[code];
    for (const feature of collection.features ?? []) {
      if (!feature.geometry) continue;
      const lgaCode = String(feature.properties?.LGA_CODE_2025 ?? "").trim();
      const name = String(feature.properties?.LGA_NAME_2025 ?? "").trim();
      if (!lgaCode || !name) continue;
      const next = simplifyFeature({
        type: "Feature",
        properties: { lgaId: lgaCode, name, stateId: meta.id },
        geometry: feature.geometry,
      });
      if (next) byState[meta.id].push(next);
    }
  }
  for (const [stateId, features] of Object.entries(byState)) {
    if (features.length === 0) {
      throw new Error(`no LGAs for ${stateId}`);
    }
    features.sort((a, b) => a.properties.lgaId.localeCompare(b.properties.lgaId));
  }
  return byState;
}

function nationalAabb(states) {
  const [west, south, east, north] = bbox(states);
  const pad = 0.02;
  return {
    south: roundCoord(south - pad),
    west: roundCoord(west - pad),
    north: roundCoord(north + pad),
    east: roundCoord(east + pad),
  };
}

function isPolygonFeature(feature) {
  return (
    feature?.geometry &&
    (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
  );
}

function unionStates(states) {
  const features = states.features.filter(isPolygonFeature);
  if (features.length === 0) {
    throw new Error("no polygon states to union for coastline");
  }
  let combined = features[0];
  for (let i = 1; i < features.length; i += 1) {
    const merged = union(featureCollection([combined, features[i]]));
    if (!isPolygonFeature(merged)) {
      throw new Error(`state union failed at index ${i}`);
    }
    combined = merged;
  }
  return combined;
}

function pushLineSegments(geometry, segments) {
  if (!geometry) return;
  if (geometry.type === "MultiLineString") {
    for (const coordinates of geometry.coordinates) {
      if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
      segments.push({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: roundCoords(coordinates) },
      });
    }
    return;
  }
  if (geometry.type === "LineString" && geometry.coordinates.length >= 2) {
    segments.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: roundCoords(geometry.coordinates),
      },
    });
  }
}

function coastlineFromStates(states, box) {
  let united = unionStates(states);
  try {
    united = simplify(united, {
      tolerance: 0.01,
      highQuality: false,
      mutate: false,
    });
  } catch {
    // Keep unsimplified union if tiny rings collapse.
  }
  const lines = polygonToLine(united);
  const list = lines.type === "FeatureCollection" ? lines.features : [lines];
  const segments = [];
  for (const line of list) {
    pushLineSegments(line?.geometry, segments);
  }
  // Drop tiny island loops; keep mainland-scale coastal segments.
  const filtered = segments.filter((segment) => segment.geometry.coordinates.length >= 8);
  if (filtered.length === 0) {
    throw new Error("coastline segments empty");
  }
  return {
    source: "abs-asgs-ste-union-exterior",
    bbox: box,
    segments: filtered,
  };
}

function writePackStubs(box) {
  mkdirSync(join(outDir, "poi"), { recursive: true });
  for (const category of POI_CATEGORIES) {
    writeJson(join(outDir, "poi", `${category}.json`), {
      category,
      source: "none",
      bbox: box,
      places: [],
    });
  }
  writeJson(join(outDir, "sea_level_seed.json"), {
    source: "none",
    bbox: box,
    divisions: 20,
    cells: [],
    cellElevations: [],
    complete: false,
  });
  writeJson(join(outDir, "international_border.json"), {
    source: "none",
    bbox: box,
    segments: [],
  });
  writeFileSync(
    join(outDir, "ATTRIBUTION.txt"),
    [
      "Australian States and Territories (STE) and Local Government Areas (LGA):",
      "Australian Bureau of Statistics (ABS), Australian Statistical Geography Standard",
      "(ASGS) Edition 3.",
      "STE: ASGS 2021 State and Territory boundaries (ArcGIS REST ASGS2021/STE,",
      "downloaded 2026-10-23, WGS84 / EPSG:4326).",
      "LGA: ASGS 2025 Local Government Areas (ArcGIS REST ASGS2025/LGA,",
      "downloaded 2026-10-23, WGS84 / EPSG:4326).",
      "Licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).",
      "Server-generalized with maxAllowableOffset≈0.0014°, then @turf/simplify",
      "tolerance 0.002°; coordinates rounded to 4 decimal places.",
      "",
      "Coastline segments: unary union of simplified STE polygons, exterior rings",
      "only (same ABS ASGS CC BY 4.0 attribution). Further simplified at 0.01°.",
      "",
      "POI bundles: empty source:none stubs pending Wikidata fill.",
      "Sea-level seed: empty source:none stub pending Open-Meteo fill.",
      "International border: empty (island continent; pack marks unsupported).",
      "",
    ].join("\n"),
  );
}

function patchPackGeoManifest(box) {
  const path = join(root, "src/domain/regions/packGeoManifest.ts");
  const text = readFileSync(path, "utf8");
  const replacement = `// AABB from public/geo/australia/states.geojson (+0.02° pad).\n  australia: { south: ${box.south}, west: ${box.west}, north: ${box.north}, east: ${box.east} },`;
  if (text.includes(replacement)) {
    return;
  }
  const next = text.replace(/(?:\/\/[^\n]*\n\s*)?australia: \{ south: [^}]+ \},/, replacement);
  if (next === text) {
    throw new Error("failed to patch REGION_PACK_REFERENCE_BBOXES.australia");
  }
  writeFileSync(path, next);
}

function main() {
  const { rawDir } = parseArgs(process.argv.slice(2));
  mkdirSync(join(outDir, "lgas"), { recursive: true });

  const states = loadSte(rawDir);
  writeJson(join(outDir, "states.geojson"), states);

  const byState = loadLgas(rawDir);
  const allLgas = [];
  for (const stateId of Object.keys(byState).sort()) {
    const collection = featureCollection(byState[stateId]);
    writeJson(join(outDir, "lgas", `${stateId}.geojson`), collection);
    allLgas.push(...byState[stateId]);
  }
  writeJson(join(outDir, "lgas.geojson"), featureCollection(allLgas));

  const box = nationalAabb(states);
  writeJson(join(outDir, "coastline.json"), coastlineFromStates(states, box));
  writePackStubs(box);
  patchPackGeoManifest(box);

  console.log(
    JSON.stringify(
      {
        states: states.features.length,
        lgas: allLgas.length,
        byState: Object.fromEntries(
          Object.entries(byState).map(([id, features]) => [id, features.length]),
        ),
        bbox: box,
        statesBytes: Buffer.byteLength(JSON.stringify(states)),
      },
      null,
      2,
    ),
  );
}

main();
