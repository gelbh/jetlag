/**
 * Build public/geo/berlin/bezirke.geojson + city.geojson from Berlin ALKIS WFS.
 * Usage: node scripts/geo/build-berlin-bezirke.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import area from "@turf/area";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import simplify from "@turf/simplify";
import union from "@turf/union";
import { BERLIN_BEZIRKE } from "./berlin-bezirk-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public", "geo", "berlin");
const UA = "JetlagBerlinPackBuild/1.0 (https://github.com/gelbh/jetlag)";

const WFS_URL =
  "https://gdi.berlin.de/services/wfs/alkis_bezirke?service=WFS&version=2.0.0&request=GetFeature&typeNames=alkis_bezirke:bezirksgrenzen&outputFormat=application/json&srsName=urn:ogc:def:crs:OGC:1.3:CRS84";

const SQ_M_TO_SQ_MI = 2589988.110336;

function padBbox([west, south, east, north], pad = 0.01) {
  return {
    south: Number((south - pad).toFixed(4)),
    west: Number((west - pad).toFixed(4)),
    north: Number((north + pad).toFixed(4)),
    east: Number((east + pad).toFixed(4)),
  };
}

async function fetchBezirkCollection() {
  const res = await fetch(WFS_URL, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Berlin WFS ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const raw = await fetchBezirkCollection();
  const byName = new Map(
    (raw.features ?? []).map((feature) => [feature.properties?.namgem, feature]),
  );

  const features = [];
  for (const bezirk of BERLIN_BEZIRKE) {
    const hit = byName.get(bezirk.wfsName);
    if (!hit?.geometry) {
      throw new Error(`Missing WFS polygon for ${bezirk.wfsName}`);
    }
    const feature = {
      type: "Feature",
      properties: { name: bezirk.name, bezirkId: bezirk.id },
      geometry: hit.geometry,
    };
    features.push(simplify(feature, { tolerance: 0.00015, highQuality: true, mutate: false }));
  }

  const bezirke = featureCollection(features);
  let city = features[0];
  for (let i = 1; i < features.length; i++) {
    const next = union(featureCollection([city, features[i]]));
    if (!next) {
      throw new Error(`union failed at ${features[i].properties.bezirkId}`);
    }
    city = next;
  }
  city = {
    type: "Feature",
    properties: { name: "Land Berlin" },
    geometry: city.geometry,
  };
  city = simplify(city, { tolerance: 0.00015, highQuality: true, mutate: false });

  const box = padBbox(bbox(bezirke));

  const playAreas = {};
  for (const feature of features) {
    playAreas[`bundled:berlin-${feature.properties.bezirkId}`] = Number(
      (area(feature) / SQ_M_TO_SQ_MI).toFixed(2),
    );
  }
  playAreas["bundled:berlin"] = Number((area(city) / SQ_M_TO_SQ_MI).toFixed(2));
  console.log("bbox", JSON.stringify(box));
  console.log("playAreas", JSON.stringify(playAreas, null, 2));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "bezirke.geojson"), `${JSON.stringify(bezirke)}\n`);
  await writeFile(
    path.join(outDir, "city.geojson"),
    `${JSON.stringify({ type: "FeatureCollection", features: [city] })}\n`,
  );
  await writeFile(
    path.join(outDir, "coastline.json"),
    `${JSON.stringify({ source: "none", bbox: box, segments: [] }, null, 2)}\n`,
  );
  await writeFile(
    path.join(outDir, "international_border.json"),
    `${JSON.stringify({ source: "none", bbox: box, segments: [] }, null, 2)}\n`,
  );
  await writeFile(
    path.join(outDir, "ATTRIBUTION.txt"),
    `Land Berlin metro pack geo

Boundaries
- Bezirk polygons: Senatsverwaltung für Stadtentwicklung, Bauen und Wohnen Berlin, ALKIS WFS alkis_bezirke:bezirksgrenzen (Datenlizenz Deutschland – Zero – Version 2.0).

POI
- Wikidata Query Service (CC0).

Sea level seed
- Open-Meteo elevation API.

Coastline
- Inland city stub (empty segments).

International border
- Landlocked city-state stub (empty segments).

GTFS
- Skipped in v1 (VBB/BVG static GTFS requires registration; rail stations use Overpass).
`,
  );
  console.log(`wrote ${features.length} bezirke to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
