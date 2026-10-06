/**
 * Build pack international_border.json matrix assets.
 * Empty stubs for metros; Switzerland filled from cantons.geojson union exterior rings.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { featureCollection } from "@turf/helpers";
import union from "@turf/union";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicGeo = join(root, "public", "geo");

const PACK_IDS = [
  "dublin",
  "nyc",
  "london",
  "tokyo",
  "osaka",
  "zurich",
  "lucerne",
  "switzerland",
  "portland-maine",
  "prince-rupert",
];

/** Mirrors REGION_PACK_REFERENCE_BBOXES (optional on stubs). */
const PACK_BBOXES = {
  dublin: { south: 53.1782, west: -6.5469, north: 53.6347, east: -5.9945 },
  nyc: { south: 40.49, west: -74.26, north: 40.92, east: -73.7 },
  london: { south: 51.28, west: -0.51, north: 51.7, east: 0.3357 },
  tokyo: { south: 35.5282, west: 139.5628, north: 35.8175, east: 139.9189 },
  osaka: { south: 34.5865, west: 135.3435, north: 34.7688, east: 135.5993 },
  zurich: { south: 47.1637, west: 8.3589, north: 47.699, east: 8.986 },
  lucerne: { south: 46.775, west: 7.839, north: 47.2903, east: 8.5213 },
  switzerland: { south: 45.798, west: 5.9359, north: 47.8285, east: 10.5121 },
  "portland-maine": {
    south: 43.4669,
    west: -70.492,
    north: 43.8488,
    east: -69.9759,
  },
  "prince-rupert": {
    south: 54.2016,
    west: -130.45,
    north: 54.4,
    east: -130.2,
  },
};

function ringToLineString(ring) {
  if (!Array.isArray(ring) || ring.length < 2) {
    return null;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first?.[0] === last?.[0] && first?.[1] === last?.[1];
  const coordinates = closed ? ring : [...ring, first];

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

function polygonRingsToLineStrings(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const segments = [];
  for (const polygonCoords of polygons) {
    const outerRing = polygonCoords[0];
    if (!outerRing) {
      continue;
    }
    const segment = ringToLineString(outerRing);
    if (segment) {
      segments.push(segment);
    }
  }
  return segments;
}

function isPolygonFeature(feature) {
  return (
    feature !== null &&
    feature !== undefined &&
    feature.type === "Feature" &&
    (feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon")
  );
}

function unionPolygonFeatures(features) {
  if (features.length === 0) {
    return null;
  }

  let combined = features[0];
  for (let i = 1; i < features.length; i += 1) {
    const next = features[i];
    const merged = union(featureCollection([combined, next]));
    if (!isPolygonFeature(merged)) {
      throw new Error(`turf union failed at feature index ${i}`);
    }
    combined = merged;
  }
  return combined;
}

function writeEmptyStub(packId) {
  const outPath = join(publicGeo, packId, "international_border.json");
  mkdirSync(dirname(outPath), { recursive: true });
  const payload = {
    source: "none",
    bbox: PACK_BBOXES[packId],
    segments: [],
  };
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`wrote stub ${packId}`);
}

function buildSwitzerland() {
  const cantonsPath = join(publicGeo, "switzerland", "cantons.geojson");
  const collection = JSON.parse(readFileSync(cantonsPath, "utf8"));
  const features = (collection.features ?? []).filter(isPolygonFeature);
  if (features.length === 0) {
    throw new Error("switzerland cantons.geojson has no polygon features");
  }

  const united = unionPolygonFeatures(features);
  if (!united) {
    throw new Error("switzerland canton union produced no geometry");
  }

  const segments = polygonRingsToLineStrings(united.geometry);
  if (segments.length === 0) {
    throw new Error("switzerland international_border segments.length === 0");
  }

  const payload = {
    source: "switzerland-cantons-union",
    bbox: PACK_BBOXES.switzerland,
    segments,
  };
  const outPath = join(publicGeo, "switzerland", "international_border.json");
  writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
  console.log(`wrote switzerland (${segments.length} segments)`);
}

for (const packId of PACK_IDS) {
  if (packId === "switzerland") {
    continue;
  }
  writeEmptyStub(packId);
}

buildSwitzerland();
