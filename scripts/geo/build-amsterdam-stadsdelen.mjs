/**
 * Build public/geo/amsterdam/stadsdelen.geojson + city.geojson from Gemeente Amsterdam Datapunt.
 * Usage: node scripts/geo/build-amsterdam-stadsdelen.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import area from "@turf/area";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import simplify from "@turf/simplify";
import union from "@turf/union";
import { AMSTERDAM_STADSDELEN } from "./amsterdam-stadsdeel-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public", "geo", "amsterdam");
const UA = "JetlagAmsterdamPackBuild/1.0 (https://github.com/gelbh/jetlag)";

const GEOJSON_URL = "https://api.data.amsterdam.nl/v1/gebieden/stadsdelen?_format=geojson";

const SQ_M_TO_SQ_MI = 2589988.110336;

function padBbox([west, south, east, north], pad = 0.01) {
  return {
    south: Number((south - pad).toFixed(4)),
    west: Number((west - pad).toFixed(4)),
    north: Number((north + pad).toFixed(4)),
    east: Number((east + pad).toFixed(4)),
  };
}

async function fetchStadsdeelCollection() {
  const res = await fetch(GEOJSON_URL, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(`Amsterdam stadsdelen ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const raw = await fetchStadsdeelCollection();
  const byCode = new Map(
    (raw.features ?? []).map((feature) => [String(feature.properties?.code ?? ""), feature]),
  );

  const features = [];
  for (const stadsdeel of AMSTERDAM_STADSDELEN) {
    const hit = byCode.get(stadsdeel.stadsdeelcode);
    if (!hit?.geometry) {
      throw new Error(`Missing polygon for stadsdeel ${stadsdeel.stadsdeelcode} (${stadsdeel.id})`);
    }
    const feature = {
      type: "Feature",
      properties: {
        name: stadsdeel.name,
        stadsdeelId: stadsdeel.id,
        stadsdeelcode: stadsdeel.stadsdeelcode,
      },
      geometry: hit.geometry,
    };
    features.push(simplify(feature, { tolerance: 0.00015, highQuality: true, mutate: false }));
  }

  const stadsdelen = featureCollection(features);
  let city = features[0];
  for (let i = 1; i < features.length; i++) {
    const next = union(featureCollection([city, features[i]]));
    if (!next) {
      throw new Error(`union failed at ${features[i].properties.stadsdeelId}`);
    }
    city = next;
  }
  city = {
    type: "Feature",
    properties: { name: "Gemeente Amsterdam" },
    geometry: city.geometry,
  };
  city = simplify(city, { tolerance: 0.00015, highQuality: true, mutate: false });

  const box = padBbox(bbox(stadsdelen));

  const playAreas = {};
  for (const feature of features) {
    playAreas[`bundled:amsterdam-${feature.properties.stadsdeelId}`] = Number(
      (area(feature) / SQ_M_TO_SQ_MI).toFixed(2),
    );
  }
  playAreas["bundled:amsterdam"] = Number((area(city) / SQ_M_TO_SQ_MI).toFixed(2));
  console.log("bbox", JSON.stringify(box));
  console.log("playAreas", JSON.stringify(playAreas, null, 2));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "stadsdelen.geojson"), `${JSON.stringify(stadsdelen)}\n`);
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
    `Gemeente Amsterdam metro pack geo

Boundaries
- Stadsdeel polygons: Gemeente Amsterdam Datapunt gebieden/stadsdelen (CC-0).

POI
- Wikidata Query Service (CC0).

Sea level seed
- Open-Meteo elevation API.

Coastline
- Harbor city stub (empty segments; IJ/Markermeer not bundled as coastline).

International border
- Municipality extent stub (empty segments).

GTFS
- Skipped in v1 (GVB/GTFS.nl clip not bundled; tram/metro stops use Overpass).
`,
  );
  console.log(`wrote ${features.length} stadsdelen to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
