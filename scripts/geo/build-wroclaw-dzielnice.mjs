/**
 * Build public/geo/wroclaw/dzielnice.geojson + city.geojson from Miasto Wrocław SIP.
 * Usage: node scripts/geo/build-wroclaw-dzielnice.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import area from "@turf/area";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import simplify from "@turf/simplify";
import union from "@turf/union";
import { WROCLAW_DZIELNICE } from "./wroclaw-dzielnica-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public", "geo", "wroclaw");
const UA = "JetlagWroclawPackBuild/1.0 (https://github.com/gelbh/jetlag)";

const QUERY_URL =
  "https://gis.um.wroc.pl/portal_srv/rest/services/Osiedla_Wroc%C5%82awia/MapServer/0/query?where=1%3D1&outFields=NROSIEDLA,NAZWAOSIEDLA&outSR=4326&f=geojson";

const SQ_M_TO_SQ_MI = 2589988.110336;

function padBbox([west, south, east, north], pad = 0.01) {
  return {
    south: Number((south - pad).toFixed(4)),
    west: Number((west - pad).toFixed(4)),
    north: Number((north + pad).toFixed(4)),
    east: Number((east + pad).toFixed(4)),
  };
}

async function fetchOsiedlaCollection() {
  const res = await fetch(QUERY_URL, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Wrocław osiedla query ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const raw = await fetchOsiedlaCollection();
  const byNumber = new Map(
    (raw.features ?? []).map((feature) => [feature.properties?.NROSIEDLA, feature]),
  );

  const features = [];
  for (const dzielnica of WROCLAW_DZIELNICE) {
    const hit = byNumber.get(dzielnica.nrosiedla);
    if (!hit?.geometry) {
      throw new Error(`Missing polygon for nrosiedla ${dzielnica.nrosiedla} (${dzielnica.id})`);
    }
    const feature = {
      type: "Feature",
      properties: {
        name: dzielnica.name,
        dzielnicaId: dzielnica.id,
        nrosiedla: dzielnica.nrosiedla,
      },
      geometry: hit.geometry,
    };
    features.push(simplify(feature, { tolerance: 0.00015, highQuality: true, mutate: false }));
  }

  const dzielnice = featureCollection(features);
  let city = features[0];
  for (let i = 1; i < features.length; i++) {
    const next = union(featureCollection([city, features[i]]));
    if (!next) {
      throw new Error(`union failed at ${features[i].properties.dzielnicaId}`);
    }
    city = next;
  }
  city = {
    type: "Feature",
    properties: { name: "Miasto Wrocław" },
    geometry: city.geometry,
  };
  city = simplify(city, { tolerance: 0.00015, highQuality: true, mutate: false });

  const box = padBbox(bbox(dzielnice));

  const playAreas = {};
  for (const feature of features) {
    playAreas[`bundled:wroclaw-${feature.properties.dzielnicaId}`] = Number(
      (area(feature) / SQ_M_TO_SQ_MI).toFixed(2),
    );
  }
  playAreas["bundled:wroclaw"] = Number((area(city) / SQ_M_TO_SQ_MI).toFixed(2));
  console.log("bbox", JSON.stringify(box));
  console.log("playAreas", JSON.stringify(playAreas, null, 2));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "dzielnice.geojson"), `${JSON.stringify(dzielnice)}\n`);
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
    `Miasto Wrocław metro pack geo

Boundaries
- Dzielnica polygons: Miasto Wrocław SIP, Osiedla wg uchwały XX/419/16 (no reuse restrictions).

POI
- Wikidata Query Service (CC0).

Sea level seed
- Open-Meteo elevation API.

Coastline
- River city stub (empty segments).

International border
- City extent stub (empty segments).

GTFS
- Skipped in v1 (no trustworthy static feed bundled; rail/tram stops use Overpass).
`,
  );
  console.log(`wrote ${features.length} dzielnice to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
