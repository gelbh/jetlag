/**
 * Build public/geo/utrecht/wijken.geojson + city.geojson from Gemeente Utrecht Open Data.
 * Usage: node scripts/geo/build-utrecht-wijken.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import area from "@turf/area";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import simplify from "@turf/simplify";
import union from "@turf/union";
import { UTRECHT_WIJKEN } from "./utrecht-wijk-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public", "geo", "utrecht");
const UA = "JetlagUtrechtPackBuild/1.0 (https://github.com/gelbh/jetlag)";

const WFS_URL =
  "https://geodata.utrecht.nl/geoserver/UtrechtOpen/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=UtrechtOpen:WIJK&outputFormat=application/json&srsName=urn:ogc:def:crs:OGC:1.3:CRS84";

const SQ_M_TO_SQ_MI = 2589988.110336;

function padBbox([west, south, east, north], pad = 0.01) {
  return {
    south: Number((south - pad).toFixed(4)),
    west: Number((west - pad).toFixed(4)),
    north: Number((north + pad).toFixed(4)),
    east: Number((east + pad).toFixed(4)),
  };
}

async function fetchWijkCollection() {
  const res = await fetch(WFS_URL, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Utrecht WFS ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const raw = await fetchWijkCollection();
  const byCode = new Map(
    (raw.features ?? []).map((feature) => [
      String(feature.properties?.WIJKCODE ?? "").padStart(2, "0"),
      feature,
    ]),
  );

  const features = [];
  for (const wijk of UTRECHT_WIJKEN) {
    const hit = byCode.get(wijk.wijkcode);
    if (!hit?.geometry) {
      throw new Error(`Missing WFS polygon for wijk ${wijk.wijkcode} (${wijk.id})`);
    }
    const feature = {
      type: "Feature",
      properties: {
        name: wijk.name,
        wijkId: wijk.id,
        wijkcode: wijk.wijkcode,
      },
      geometry: hit.geometry,
    };
    features.push(simplify(feature, { tolerance: 0.00015, highQuality: true, mutate: false }));
  }

  const wijken = featureCollection(features);
  let city = features[0];
  for (let i = 1; i < features.length; i++) {
    const next = union(featureCollection([city, features[i]]));
    if (!next) {
      throw new Error(`union failed at ${features[i].properties.wijkId}`);
    }
    city = next;
  }
  city = {
    type: "Feature",
    properties: { name: "Gemeente Utrecht" },
    geometry: city.geometry,
  };
  city = simplify(city, { tolerance: 0.00015, highQuality: true, mutate: false });

  const box = padBbox(bbox(wijken));

  const playAreas = {};
  for (const feature of features) {
    playAreas[`bundled:utrecht-${feature.properties.wijkId}`] = Number(
      (area(feature) / SQ_M_TO_SQ_MI).toFixed(2),
    );
  }
  playAreas["bundled:utrecht"] = Number((area(city) / SQ_M_TO_SQ_MI).toFixed(2));
  console.log("bbox", JSON.stringify(box));
  console.log("playAreas", JSON.stringify(playAreas, null, 2));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "wijken.geojson"), `${JSON.stringify(wijken)}\n`);
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
    `Gemeente Utrecht metro pack geo

Boundaries
- Wijk polygons: Gemeente Utrecht, UtrechtOpen WIJK WFS (CC-BY-SA 4.0).

POI
- Wikidata Query Service (CC0).

Sea level seed
- Open-Meteo elevation API.

Coastline
- Inland municipality stub (empty segments).

International border
- Landlocked municipality stub (empty segments).

GTFS
- Skipped in v1 (OVapi/GTFS.nl clip not bundled; rail stations use Overpass).
`,
  );
  console.log(`wrote ${features.length} wijken to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
