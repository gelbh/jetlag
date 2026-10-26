/**
 * Build public/geo/brussels/communes.geojson + city.geojson from Nominatim polygons.
 * Usage: node scripts/geo/build-brussels-communes.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import simplify from "@turf/simplify";
import union from "@turf/union";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outDir = path.join(root, "public", "geo", "brussels");
const UA = "JetlagBrusselsPackBuild/1.0 (https://github.com/gelbh/jetlag)";

/** Locked commune table (French display names used in Brussels Capital). */
export const BRUSSELS_COMMUNES = [
  { id: "anderlecht", name: "Anderlecht", qid: "Q275268" },
  { id: "auderghem", name: "Auderghem", qid: "Q237243" },
  { id: "berchem-sainte-agathe", name: "Berchem-Sainte-Agathe", qid: "Q288002" },
  { id: "bruxelles", name: "City of Brussels", qid: "Q239" },
  { id: "etterbeek", name: "Etterbeek", qid: "Q192859" },
  { id: "evere", name: "Evere", qid: "Q179541" },
  { id: "forest", name: "Forest", qid: "Q72946" },
  { id: "ganshoren", name: "Ganshoren", qid: "Q269711" },
  { id: "ixelles", name: "Ixelles", qid: "Q208713" },
  { id: "jette", name: "Jette", qid: "Q241895" },
  { id: "koekelberg", name: "Koekelberg", qid: "Q180985" },
  { id: "molenbeek-saint-jean", name: "Molenbeek-Saint-Jean", qid: "Q180806" },
  { id: "saint-gilles", name: "Saint-Gilles", qid: "Q203322" },
  { id: "saint-josse-ten-noode", name: "Saint-Josse-ten-Noode", qid: "Q272243" },
  { id: "schaerbeek", name: "Schaerbeek", qid: "Q12892" },
  { id: "uccle", name: "Uccle", qid: "Q203312" },
  { id: "watermael-boitsfort", name: "Watermael-Boitsfort", qid: "Q211242" },
  { id: "woluwe-saint-lambert", name: "Woluwe-Saint-Lambert", qid: "Q211634" },
  { id: "woluwe-saint-pierre", name: "Woluwe-Saint-Pierre", qid: "Q216082" },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCommunePolygon(commune) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    format: "jsonv2",
    polygon_geojson: "1",
    limit: "1",
    city: commune.name === "City of Brussels" ? "Bruxelles" : commune.name,
    county: "Bruxelles-Capitale",
    country: "Belgium",
    featuretype: "settlement",
  })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Nominatim ${res.status} for ${commune.id}: ${await res.text()}`);
  }
  const rows = await res.json();
  const hit =
    rows.find(
      (r) => r.geojson && (r.geojson.type === "Polygon" || r.geojson.type === "MultiPolygon"),
    ) ?? rows[0];
  if (!hit?.geojson) {
    throw new Error(`No polygon for ${commune.id}`);
  }
  return {
    type: "Feature",
    properties: { name: commune.name, communeId: commune.id },
    geometry: hit.geojson,
  };
}

async function main() {
  const features = [];
  for (const commune of BRUSSELS_COMMUNES) {
    console.log(`fetch ${commune.id}`);
    const feature = await fetchCommunePolygon(commune);
    const simplified = simplify(feature, { tolerance: 0.00015, highQuality: true, mutate: false });
    features.push(simplified);
    await sleep(1100);
  }

  const communes = featureCollection(features);
  let city = features[0];
  for (let i = 1; i < features.length; i++) {
    const next = union(featureCollection([city, features[i]]));
    if (!next) {
      throw new Error(`union failed at ${features[i].properties.communeId}`);
    }
    city = next;
  }
  city = {
    type: "Feature",
    properties: { name: "Brussels-Capital Region" },
    geometry: city.geometry,
  };
  city = simplify(city, { tolerance: 0.00015, highQuality: true, mutate: false });

  const [west, south, east, north] = bbox(communes);
  console.log(
    "bbox",
    JSON.stringify({
      south: Number((south - 0.01).toFixed(4)),
      west: Number((west - 0.01).toFixed(4)),
      north: Number((north + 0.01).toFixed(4)),
      east: Number((east + 0.01).toFixed(4)),
    }),
  );

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "communes.geojson"), `${JSON.stringify(communes)}\n`);
  await writeFile(
    path.join(outDir, "city.geojson"),
    `${JSON.stringify({ type: "FeatureCollection", features: [city] })}\n`,
  );
  console.log(`wrote ${features.length} communes to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
