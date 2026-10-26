/**
 * Build public/geo/singapore/planning-areas.geojson + city.geojson from URA MP2014 polygons.
 * Source: Esri-hosted mirror of Master Plan 2014 planning area boundaries (data.gov.sg).
 * Usage: node scripts/geo/build-singapore-planning-areas.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import area from "@turf/area";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import simplify from "@turf/simplify";
import union from "@turf/union";
import { SINGAPORE_PLANNING_AREAS } from "./singapore-planning-area-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public", "geo", "singapore");
const UA = "JetlagSingaporePackBuild/1.0 (https://github.com/gelbh/jetlag)";

const ARCGIS_URL =
  "https://services5.arcgis.com/XqaKEQIgV03geG0E/arcgis/rest/services/Planning_Area/FeatureServer/0/query?where=1%3D1&outFields=PLN_AREA_N&returnGeometry=true&outSR=4326&f=geojson";

const SQ_M_TO_SQ_MI = 2589988.110336;

function padBbox([west, south, east, north], pad = 0.01) {
  return {
    south: Number((south - pad).toFixed(4)),
    west: Number((west - pad).toFixed(4)),
    north: Number((north + pad).toFixed(4)),
    east: Number((east + pad).toFixed(4)),
  };
}

function slugFromUraName(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-|-$/g, "");
}

async function fetchPlanningAreaCollection() {
  const res = await fetch(ARCGIS_URL, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`ArcGIS ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const raw = await fetchPlanningAreaCollection();
  const bySlug = new Map();
  for (const feature of raw.features ?? []) {
    const rawName = feature.properties?.PLN_AREA_N;
    if (!rawName || !feature.geometry) continue;
    const slug = slugFromUraName(rawName);
    bySlug.set(slug, feature);
  }

  const features = [];
  for (const planningArea of SINGAPORE_PLANNING_AREAS) {
    const hit = bySlug.get(planningArea.id);
    if (!hit?.geometry) {
      throw new Error(`Missing polygon for ${planningArea.id} (${planningArea.name})`);
    }
    features.push(
      simplify(
        {
          type: "Feature",
          properties: { name: planningArea.name, planningAreaId: planningArea.id },
          geometry: hit.geometry,
        },
        { tolerance: 0.00008, highQuality: true, mutate: false },
      ),
    );
  }

  const planningAreas = featureCollection(features);
  let city = features[0];
  for (let i = 1; i < features.length; i++) {
    const next = union(featureCollection([city, features[i]]));
    if (!next) {
      throw new Error(`union failed at ${features[i].properties.planningAreaId}`);
    }
    city = next;
  }
  city = {
    type: "Feature",
    properties: { name: "Singapore" },
    geometry: city.geometry,
  };
  city = simplify(city, { tolerance: 0.00008, highQuality: true, mutate: false });

  const box = padBbox(bbox(planningAreas));
  const playAreas = {};
  for (const feature of features) {
    playAreas[`bundled:singapore-${feature.properties.planningAreaId}`] = Number(
      (area(feature) / SQ_M_TO_SQ_MI).toFixed(2),
    );
  }
  playAreas["bundled:singapore"] = Number((area(city) / SQ_M_TO_SQ_MI).toFixed(2));

  console.log("bbox", JSON.stringify(box));
  console.log("featureCount", features.length);
  console.log("playAreas", JSON.stringify(playAreas, null, 2));

  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "planning-areas.geojson"),
    `${JSON.stringify(planningAreas)}\n`,
  );
  await writeFile(
    path.join(outDir, "city.geojson"),
    `${JSON.stringify({ type: "FeatureCollection", features: [city] })}\n`,
  );
  await writeFile(
    path.join(outDir, "coastline.json"),
    // stub (not none): empty bundle still allows Overpass at runtime (London/Sydney pattern).
    `${JSON.stringify({ source: "stub", bbox: box, segments: [] }, null, 2)}\n`,
  );
  await writeFile(
    path.join(outDir, "international_border.json"),
    `${JSON.stringify({ source: "none", bbox: box, segments: [] }, null, 2)}\n`,
  );
  await writeFile(
    path.join(outDir, "ATTRIBUTION.txt"),
    `Singapore metro pack geo

Boundaries
- Planning area polygons: Urban Redevelopment Authority Master Plan 2014 (via Esri FeatureServer Planning_Area / data.gov.sg dataset Master Plan 2014 Planning Area Boundary).

POI
- Wikidata Query Service (CC0).

Sea level seed
- Open-Meteo elevation API.

Coastline
- Island nation stub source (empty segments; coastline via Overpass in gameplay).

International border
- City-state stub (empty segments).

GTFS
- Skipped in v1 (LTA static GTFS not bundled; rail stations use Overpass).
`,
  );
  console.log(`wrote ${features.length} planning areas to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
