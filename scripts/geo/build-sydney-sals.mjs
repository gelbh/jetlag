/**
 * Build public/geo/sydney/sals.geojson from ABS ASGS2021 SAL (Edition 3).
 *
 * Query: geo.abs.gov.au ASGS2021/SAL MapServer/0, envelope intersects Sydney AABB,
 * outSR=4326, maxAllowableOffset=0.0014, then @turf/simplify tolerance 0.002.
 * Parent lgaId: SAL feature centroid must lie inside a Greater Sydney LGA polygon;
 * SALs with no centroid hit are dropped (metro clip).
 *
 * Usage: node scripts/geo/build-sydney-sals.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { featureCollection, point } from "@turf/helpers";
import simplify from "@turf/simplify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const lgasPath = join(root, "public/geo/sydney/lgas.geojson");
const outPath = join(root, "public/geo/sydney/sals.geojson");

const SAL_QUERY = "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/SAL/MapServer/0/query";

const ENVELOPE = {
  xmin: 150.0148,
  ymin: -34.3374,
  xmax: 151.343,
  ymax: -32.9961,
  spatialReference: { wkid: 4326 },
};

const MAX_OFFSET = 0.0014;
const SIMPLIFY_TOLERANCE = 0.002;
const ROUND_DECIMALS = 4;
const PAGE_SIZE = 2000;

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
    // keep server-generalized verts
  }
  const cleaned = cleanGeometry(geometry);
  if (!cleaned) return null;
  return { type: "Feature", properties: feature.properties, geometry: cleaned };
}

async function fetchSalPage(offset) {
  const params = new URLSearchParams({
    where: "state_code_2021='1'",
    geometry: JSON.stringify(ENVELOPE),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "sal_code_2021,sal_name_2021",
    returnGeometry: "true",
    outSR: "4326",
    maxAllowableOffset: String(MAX_OFFSET),
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
    f: "geojson",
  });
  const res = await fetch(`${SAL_QUERY}?${params}`);
  if (!res.ok) {
    throw new Error(`ABS SAL query failed: ${res.status} ${res.statusText}`);
  }
  return /** @type {import("geojson").FeatureCollection} */ (await res.json());
}

async function fetchAllSalInEnvelope() {
  /** @type {import("geojson").Feature[]} */
  const all = [];
  let offset = 0;
  for (;;) {
    const page = await fetchSalPage(offset);
    const features = page.features ?? [];
    all.push(...features);
    if (features.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

function ringCentroid(ring) {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(twiceArea) < 1e-14) {
    return ring[0];
  }
  const factor = 1 / (3 * twiceArea);
  return [cx * factor, cy * factor];
}

function featureCentroid(feature) {
  const { geometry } = feature;
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    return point(ringCentroid(geometry.coordinates[0]));
  }
  if (geometry.type === "MultiPolygon") {
    let best = null;
    let bestLen = -1;
    for (const poly of geometry.coordinates) {
      const ring = poly[0];
      if (ring.length > bestLen) {
        bestLen = ring.length;
        best = ringCentroid(ring);
      }
    }
    return best ? point(best) : null;
  }
  return null;
}

function loadLgaIndex() {
  const collection = JSON.parse(readFileSync(lgasPath, "utf8"));
  return (collection.features ?? []).map((f) => ({
    lgaId: String(f.properties.lgaId),
    geometry: f.geometry,
  }));
}

function assignLgaId(salFeature, lgaIndex) {
  const center = featureCentroid(salFeature);
  if (!center) return null;
  for (const lga of lgaIndex) {
    if (
      booleanPointInPolygon(center, {
        type: "Feature",
        properties: {},
        geometry: lga.geometry,
      })
    ) {
      return lga.lgaId;
    }
  }
  return null;
}

async function main() {
  const lgaIndex = loadLgaIndex();
  const raw = await fetchAllSalInEnvelope();
  /** @type {import("geojson").Feature[]} */
  const features = [];

  for (const feature of raw) {
    if (!feature.geometry) continue;
    const salId = String(feature.properties?.sal_code_2021 ?? "").trim();
    const name = String(feature.properties?.sal_name_2021 ?? "").trim();
    if (!salId || !name) continue;

    const lgaId = assignLgaId(feature, lgaIndex);
    if (!lgaId) continue;

    const next = simplifyFeature({
      type: "Feature",
      properties: { salId, name, lgaId },
      geometry: feature.geometry,
    });
    if (next) features.push(next);
  }

  features.sort((a, b) => String(a.properties.salId).localeCompare(String(b.properties.salId)));

  if (features.length === 0) {
    throw new Error("no SAL features after LGA clip");
  }

  writeFileSync(outPath, `${JSON.stringify(featureCollection(features))}\n`);
  console.log(`Wrote ${features.length} SAL features to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
