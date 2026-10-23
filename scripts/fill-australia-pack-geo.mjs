#!/usr/bin/env node
/**
 * Fill Australia pack gameplay geo stubs:
 * - public/geo/australia/poi/*.json via Wikidata SPARQL (WDQS)
 * - public/geo/australia/sea_level_seed.json via Open-Meteo elevation
 *
 * Adapted from scripts/fill-southampton-pack-geo.mjs (Australia P17 + pack bbox).
 * Does not mutate Swiss/Southampton pack defaults.
 *
 * Hygiene uses the canonical TS module (jiti), not a forked copy:
 *   src/services/geo/overpass/bundledPoiHygiene.ts
 *
 * Usage:
 *   node scripts/fill-australia-pack-geo.mjs
 *   node scripts/fill-australia-pack-geo.mjs --poi-only
 *   node scripts/fill-australia-pack-geo.mjs --sea-level-only
 *   node scripts/fill-australia-pack-geo.mjs --category museum
 *   node scripts/fill-australia-pack-geo.mjs --sanitize-disk
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POI_DIR = path.join(ROOT, "public", "geo", "australia", "poi");
const SEA_LEVEL_PATH = path.join(ROOT, "public", "geo", "australia", "sea_level_seed.json");

const jiti = createJiti(import.meta.url, {
  alias: { "@": path.join(ROOT, "src") },
});

const { sanitizeBundledPoiPlaces } = jiti(
  path.join(ROOT, "src/services/geo/overpass/bundledPoiHygiene.ts"),
);
const { REGION_PACK_REFERENCE_BBOXES } = jiti(
  path.join(ROOT, "src/domain/regions/packGeoManifest.ts"),
);
const { PACK_SEA_LEVEL_SEED_DIVISIONS } = jiti(
  path.join(ROOT, "src/domain/geometry/measuring/seaLevel.ts"),
);
const { OPEN_METEO_ELEVATION_ENDPOINT } = jiti(
  path.join(ROOT, "src/services/geo/elevation/constants.ts"),
);

const UA = "JetlagAustraliaPoiFill/1.0 (https://github.com/gelbh/jetlag; australia pack fill)";
const WDQS = "https://query.wikidata.org/sparql";
const PACK_BBOX = REGION_PACK_REFERENCE_BBOXES.australia;
const ELEVATION_BATCH_SIZE = 100;
const ELEVATION_GAP_MS = 300;

/**
 * Category → Wikidata class QID(s). Types use inverted path
 * wd:TYPE ^wdt:P279* /^ wdt:P31 ?item after P17=Q408 (Australia).
 */
const CATEGORIES = {
  amusement_park: { types: ["Q194195"] },
  aquarium: { types: ["Q19760", "Q2281788"] },
  body_of_water: { types: ["Q23397"] },
  commercial_airport: { types: ["Q1248784"] },
  foreign_consulate: { types: ["Q7843791", "Q3917681"] },
  golf_course: { types: ["Q1048525"] },
  hospital: { types: ["Q16917"] },
  library: { types: ["Q7075"] },
  mountain: {
    types: ["Q8502"],
    extra: "?item wdt:P2660 ?prom . FILTER(xsd:decimal(?prom) >= 150)",
  },
  movie_theater: { types: ["Q41253"] },
  museum: { types: ["Q33506"] },
  park: { types: ["Q22698"] },
  rail_station: { types: ["Q55488", "Q928830"] },
  zoo: { types: ["Q43501"] },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sparql(query, attempt = 1) {
  const url = `${WDQS}?${new URLSearchParams({ query, format: "json" })}`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": UA },
  });
  const text = await res.text();
  if (!res.ok || text.startsWith("Upstream") || text.includes("Timeout")) {
    if (attempt < 5) {
      await sleep(1500 * attempt);
      return sparql(query, attempt + 1);
    }
    throw new Error(`SPARQL ${res.status}: ${text.slice(0, 240)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    if (attempt < 5) {
      await sleep(1500 * attempt);
      return sparql(query, attempt + 1);
    }
    throw new Error(`SPARQL non-JSON: ${text.slice(0, 240)}`);
  }
}

function parseWktPoint(wkt) {
  const match = /^Point\(([-\d.]+)\s+([-\d.]+)/i.exec(String(wkt).trim());
  if (!match) return null;
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function inBbox(lat, lng, bbox) {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

function buildCategoryQuery(typeQid, extra = "") {
  // Australia + pack bbox via wikibase:box (national AU without box times out on WDQS).
  // Inverted type path; skip dissolved/closed; labels via rdfs.
  return `
SELECT DISTINCT ?item ?coord ?label WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(${PACK_BBOX.west} ${PACK_BBOX.south})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(${PACK_BBOX.east} ${PACK_BBOX.north})"^^geo:wktLiteral .
  }
  ?item wdt:P17 wd:Q408 .
  wd:${typeQid} ^wdt:P279*/^wdt:P31 ?item .
  FILTER NOT EXISTS { ?item wdt:P576 ?_dissolved }
  FILTER NOT EXISTS { ?item wdt:P3999 ?_dateClosed }
  FILTER NOT EXISTS {
    VALUES ?closedState { wd:Q56556915 wd:Q811701 wd:Q109551065 wd:Q19860854 }
    ?item wdt:P5817 ?closedState .
  }
  ${extra}
  OPTIONAL {
    ?item rdfs:label ?label .
    FILTER(LANG(?label) = "en")
  }
}
`.trim();
}

async function fetchCategoryPlaces(category, config) {
  const byId = new Map();
  for (const typeQid of config.types) {
    process.stdout.write(`  WDQS ${category} ← ${typeQid}… `);
    const data = await sparql(buildCategoryQuery(typeQid, config.extra ?? ""));
    let added = 0;
    for (const row of data.results.bindings) {
      const id = row.item.value.split("/").pop();
      if (!id || !/^Q\d+$/.test(id)) continue;
      const point = parseWktPoint(row.coord?.value ?? "");
      if (!point || !inBbox(point.lat, point.lng, PACK_BBOX)) continue;
      const name = row.label?.value?.trim() ?? id;
      if (!byId.has(id)) {
        byId.set(id, { id, name, lat: point.lat, lng: point.lng });
        added += 1;
      }
    }
    console.log(`${added} new (${byId.size} total)`);
    await sleep(800);
  }

  const missing = [...byId.values()].filter((p) => p.name === p.id).map((p) => p.id);
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    const values = batch.map((qid) => `wd:${qid}`).join(" ");
    const query = `
SELECT ?item ?label WHERE {
  VALUES ?item { ${values} }
  ?item rdfs:label ?label .
  FILTER(LANG(?label) IN ("en", "mul"))
}
`.trim();
    const data = await sparql(query);
    const best = new Map();
    const rank = { en: 0, mul: 1 };
    for (const row of data.results.bindings) {
      const id = row.item.value.split("/").pop();
      const lang = row.label["xml:lang"] ?? "mul";
      const label = row.label.value.trim();
      if (!label) continue;
      const prev = best.get(id);
      if (!prev || (rank[lang] ?? 9) < prev.rank) {
        best.set(id, { label, rank: rank[lang] ?? 9 });
      }
    }
    for (const [id, { label }] of best) {
      const place = byId.get(id);
      if (place) place.name = label;
    }
    await sleep(500);
  }

  const named = [...byId.values()].filter((p) => p.name && p.name !== p.id);
  return sanitizeBundledPoiPlaces(named, category);
}

function compactJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writePoiCategory(category, places) {
  const payload =
    places.length === 0
      ? { category, source: "none", places: [] }
      : {
          category,
          source: "wikidata",
          bbox: PACK_BBOX,
          places: places
            .map((p) => ({
              id: p.id,
              name: p.name,
              lat: Number(p.lat.toFixed(6)),
              lng: Number(p.lng.toFixed(6)),
            }))
            .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
        };
  await writeFile(path.join(POI_DIR, `${category}.json`), compactJson(payload), "utf8");
  return payload;
}

async function sanitizeDiskPoi() {
  for (const category of Object.keys(CATEGORIES)) {
    const filePath = path.join(POI_DIR, `${category}.json`);
    const payload = JSON.parse(await readFile(filePath, "utf8"));
    const before = payload.places?.length ?? 0;
    const places = sanitizeBundledPoiPlaces(payload.places ?? [], category);
    const next = await writePoiCategory(category, places);
    console.log(`sanitize ${category}: ${before} → ${next.places.length}`);
  }
}

function buildSeedCells(bbox, divisions) {
  const latStep = (bbox.north - bbox.south) / divisions;
  const lngStep = (bbox.east - bbox.west) / divisions;
  const cells = [];
  for (let row = 0; row < divisions; row += 1) {
    for (let col = 0; col < divisions; col += 1) {
      const south = bbox.south + row * latStep;
      const north = bbox.south + (row + 1) * latStep;
      const west = bbox.west + col * lngStep;
      const east = bbox.west + (col + 1) * lngStep;
      cells.push({
        point: [(south + north) / 2, (west + east) / 2],
        south,
        west,
        north,
        east,
        row,
        col,
      });
    }
  }
  return cells;
}

async function fetchElevations(points) {
  const elevations = [];
  for (let i = 0; i < points.length; i += ELEVATION_BATCH_SIZE) {
    const batch = points.slice(i, i + ELEVATION_BATCH_SIZE);
    const url = `${OPEN_METEO_ELEVATION_ENDPOINT}?${new URLSearchParams({
      latitude: batch.map((p) => p[0]).join(","),
      longitude: batch.map((p) => p[1]).join(","),
    })}`;
    process.stdout.write(`  open-meteo batch ${i / ELEVATION_BATCH_SIZE + 1}… `);
    let attempt = 1;
    for (;;) {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status === 429 && attempt < 6) {
        console.log(`429, retry ${attempt}`);
        await sleep(2000 * attempt);
        attempt += 1;
        continue;
      }
      if (!res.ok) {
        throw new Error(`open-meteo ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      const data = await res.json();
      if (!Array.isArray(data.elevation) || data.elevation.length !== batch.length) {
        throw new Error("open-meteo elevation length mismatch");
      }
      elevations.push(...data.elevation.map((v) => (typeof v === "number" ? v : Number.NaN)));
      console.log("ok");
      break;
    }
    await sleep(ELEVATION_GAP_MS);
  }
  return elevations;
}

async function writeSeaLevelSeed() {
  const cells = buildSeedCells(PACK_BBOX, PACK_SEA_LEVEL_SEED_DIVISIONS);
  const cellElevations = await fetchElevations(cells.map((c) => c.point));
  const finite = cellElevations.filter((v) => Number.isFinite(v)).length;
  if (finite !== cells.length) {
    throw new Error(`sea_level incomplete: ${finite}/${cells.length} finite`);
  }
  const payload = {
    source: "open-meteo",
    bbox: PACK_BBOX,
    divisions: PACK_SEA_LEVEL_SEED_DIVISIONS,
    cells,
    cellElevations,
    complete: true,
  };
  await writeFile(SEA_LEVEL_PATH, compactJson(payload), "utf8");
  console.log(`sea_level_seed: ${cells.length} cells, complete=true`);
}

function parseArgs(argv) {
  const args = {
    poi: true,
    seaLevel: true,
    category: null,
    sanitizeDisk: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--poi-only") {
      args.seaLevel = false;
    } else if (a === "--sea-level-only") {
      args.poi = false;
    } else if (a === "--sanitize-disk") {
      args.sanitizeDisk = true;
      args.poi = false;
      args.seaLevel = false;
    } else if (a === "--category") {
      args.category = argv[++i];
      args.seaLevel = false;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(POI_DIR, { recursive: true });

  if (!PACK_BBOX) {
    throw new Error("REGION_PACK_REFERENCE_BBOXES.australia missing");
  }

  if (args.sanitizeDisk) {
    console.log("=== sanitize-disk (canonical bundledPoiHygiene) ===");
    await sanitizeDiskPoi();
    return;
  }

  if (args.poi) {
    const categories = args.category
      ? [[args.category, CATEGORIES[args.category]]]
      : Object.entries(CATEGORIES);
    for (const [category, config] of categories) {
      if (!config) {
        throw new Error(`Unknown category: ${category}`);
      }
      console.log(`\n=== ${category} ===`);
      const places = await fetchCategoryPlaces(category, config);
      const payload = await writePoiCategory(category, places);
      console.log(`wrote ${category}: source=${payload.source} places=${payload.places.length}`);
    }
  }

  if (args.seaLevel) {
    console.log("\n=== sea_level_seed ===");
    await writeSeaLevelSeed();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
