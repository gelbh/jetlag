/**
 * Build public/geo/brisbane/wards.geojson + city.geojson from QLD ECQ ward boundaries.
 * Usage: node scripts/geo/build-brisbane-wards.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import area from "@turf/area";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import simplify from "@turf/simplify";
import union from "@turf/union";
import { BRISBANE_WARDS } from "./brisbane-ward-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public", "geo", "brisbane");
const UA = "JetlagBrisbanePackBuild/1.0 (https://github.com/gelbh/jetlag)";

const ARCGIS_URL =
  "https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Boundaries/AdministrativeBoundaries/MapServer/8/query?where=1%3D1&outFields=ward_name&returnGeometry=true&outSR=4326&f=geojson";

const SQ_M_TO_SQ_MI = 2589988.110336;

function padBbox([west, south, east, north], pad = 0.01) {
  return {
    south: Number((south - pad).toFixed(4)),
    west: Number((west - pad).toFixed(4)),
    north: Number((north + pad).toFixed(4)),
    east: Number((east + pad).toFixed(4)),
  };
}

async function fetchWardCollection() {
  const res = await fetch(ARCGIS_URL, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`ArcGIS ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function fetchCoastlineSegments(box) {
  const { south, west, north, east } = box;
  const query = `[out:json][timeout:120];way["natural"="coastline"](${south},${west},${north},${east});out geom;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) {
    throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  }
  const payload = await res.json();
  const segments = [];
  for (const element of payload.elements ?? []) {
    if (element.type !== "way" || !Array.isArray(element.geometry) || element.geometry.length < 2) {
      continue;
    }
    segments.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: element.geometry.map((node) => [node.lon, node.lat]),
      },
    });
  }
  return segments;
}

async function main() {
  const raw = await fetchWardCollection();
  const byName = new Map(
    (raw.features ?? []).map((feature) => [feature.properties?.ward_name, feature]),
  );

  const features = [];
  for (const ward of BRISBANE_WARDS) {
    const hit = byName.get(ward.arcgisName);
    if (!hit?.geometry) {
      throw new Error(`Missing ArcGIS polygon for ${ward.arcgisName}`);
    }
    const feature = {
      type: "Feature",
      properties: { name: ward.name, wardId: ward.id },
      geometry: hit.geometry,
    };
    features.push(simplify(feature, { tolerance: 0.00015, highQuality: true, mutate: false }));
  }

  const wards = featureCollection(features);
  let city = features[0];
  for (let i = 1; i < features.length; i++) {
    const next = union(featureCollection([city, features[i]]));
    if (!next) {
      throw new Error(`union failed at ${features[i].properties.wardId}`);
    }
    city = next;
  }
  city = {
    type: "Feature",
    properties: { name: "City of Brisbane" },
    geometry: city.geometry,
  };
  city = simplify(city, { tolerance: 0.00015, highQuality: true, mutate: false });

  const box = padBbox(bbox(wards));
  console.log("bbox", JSON.stringify(box));

  let coastlineSegments = [];
  try {
    coastlineSegments = (await fetchCoastlineSegments(box)).map((feature) =>
      simplify(feature, { tolerance: 0.0004, highQuality: true, mutate: false }),
    );
    console.log(`coastline segments: ${coastlineSegments.length}`);
  } catch (error) {
    console.warn(`coastline fetch failed (${error.message}); writing empty stub`);
  }

  const playAreas = {};
  for (const feature of features) {
    playAreas[`bundled:brisbane-${feature.properties.wardId}`] = Number(
      (area(feature) / SQ_M_TO_SQ_MI).toFixed(2),
    );
  }
  playAreas["bundled:brisbane"] = Number((area(city) / SQ_M_TO_SQ_MI).toFixed(2));
  console.log("playAreas", JSON.stringify(playAreas, null, 2));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "wards.geojson"), `${JSON.stringify(wards)}\n`);
  await writeFile(
    path.join(outDir, "city.geojson"),
    `${JSON.stringify({ type: "FeatureCollection", features: [city] })}\n`,
  );
  // Simplify before write: raw Overpass ways exceed Biome files.maxSize (1 MiB) when pretty-printed.
  await writeFile(
    path.join(outDir, "coastline.json"),
    `${JSON.stringify(
      {
        source: coastlineSegments.length > 0 ? "overpass" : "none",
        bbox: box,
        segments: coastlineSegments,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(outDir, "international_border.json"),
    `${JSON.stringify({ source: "none", bbox: box, segments: [] }, null, 2)}\n`,
  );
  await writeFile(
    path.join(outDir, "ATTRIBUTION.txt"),
    `City of Brisbane LGA pack geo

Boundaries
- Ward polygons: Queensland ECQ / Department of Resources Administrative Boundaries (Brisbane City Council ward layer, MapServer/8), © State of Queensland.
- Display names: Brisbane City Council ward names.

POI
- Wikidata Query Service (CC0).

Sea level seed
- Open-Meteo elevation API.

Coastline
- OpenStreetMap contributors (ODbL 1.0), natural=coastline ways (Moreton Bay / Brisbane River when fetch succeeds).

International border
- Inland metro stub (empty segments).

GTFS
- Skipped in v1 (TransLink GTFS not registered; stations use Overpass).
`,
  );
  console.log(`wrote ${features.length} wards to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
