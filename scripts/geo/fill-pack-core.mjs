/**
 * Shared pack geo fill: WDQS POI + Open-Meteo sea-level seed + bundled POI hygiene.
 *
 * Pack-specific knobs live in PACK_DEFS; resolvePackMapping is pure for tests.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createJiti } from "jiti";

const WDQS = "https://query.wikidata.org/sparql";
const ELEVATION_BATCH_SIZE = 100;
const ELEVATION_GAP_MS = 300;

/** Closed / dissolved / abandoned filters shared by UK + AU queries. */
const CLOSED_FILTERS = `
  FILTER NOT EXISTS { ?item wdt:P576 ?_dissolved }
  FILTER NOT EXISTS { ?item wdt:P3999 ?_dateClosed }
  FILTER NOT EXISTS {
    VALUES ?closedState { wd:Q56556915 wd:Q811701 wd:Q109551065 wd:Q19860854 }
    ?item wdt:P5817 ?closedState .
  }
`.trim();

/**
 * Category → Wikidata class QID(s). Types use inverted path
 * wd:TYPE ^wdt:P279* /^ wdt:P31 ?item after country P17.
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

/**
 * @typedef {"country" | "country-closed" | "box-closed"} PackQueryMode
 *
 * @typedef {{
 *   ua: string,
 *   countryQid: string,
 *   queryMode: PackQueryMode,
 *   labelLangs: string[],
 * }} PackDef
 */

/** @type {Readonly<Record<string, PackDef>>} */
const PACK_DEFS = {
  switzerland: {
    ua: "JetlagSwissPoiFill/1.0 (https://github.com/gelbh/jetlag; switzerland pack fill)",
    countryQid: "Q39",
    queryMode: "country",
    labelLangs: ["en", "de", "fr", "it", "mul"],
  },
  southampton: {
    ua: "JetlagSouthamptonPoiFill/1.0 (https://github.com/gelbh/jetlag; southampton pack fill)",
    countryQid: "Q145",
    queryMode: "country-closed",
    labelLangs: ["en", "mul"],
  },
  australia: {
    ua: "JetlagAustraliaPoiFill/1.0 (https://github.com/gelbh/jetlag; australia pack fill)",
    countryQid: "Q408",
    queryMode: "box-closed",
    labelLangs: ["en", "mul"],
  },
};

export const KNOWN_PACK_IDS = Object.freeze(Object.keys(PACK_DEFS));

/**
 * Pure pack id → paths / UA / bbox key (for tests and CLI).
 *
 * @param {string} packId
 * @param {string} root repo root
 * @returns {{ poiDir: string, seaLevelPath: string, ua: string, bboxKey: string }}
 */
export function resolvePackMapping(packId, root) {
  const def = PACK_DEFS[packId];
  if (!def) {
    throw new Error(`Unknown pack: ${packId}. Known: ${KNOWN_PACK_IDS.join(", ")}`);
  }
  const geoDir = path.join(root, "public", "geo", packId);
  return {
    poiDir: path.join(geoDir, "poi"),
    seaLevelPath: path.join(geoDir, "sea_level_seed.json"),
    ua: def.ua,
    bboxKey: packId,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function compactJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
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

/**
 * @param {PackDef} def
 * @param {{ south: number, west: number, north: number, east: number }} bbox
 * @param {string} typeQid
 * @param {string} [extra]
 */
function buildCategoryQuery(def, bbox, typeQid, extra = "") {
  const closed = def.queryMode === "country" ? "" : CLOSED_FILTERS;
  if (def.queryMode === "box-closed") {
    return `
SELECT DISTINCT ?item ?coord ?label WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(${bbox.west} ${bbox.south})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(${bbox.east} ${bbox.north})"^^geo:wktLiteral .
  }
  ?item wdt:P17 wd:${def.countryQid} .
  wd:${typeQid} ^wdt:P279*/^wdt:P31 ?item .
  ${closed}
  ${extra}
  OPTIONAL {
    ?item rdfs:label ?label .
    FILTER(LANG(?label) = "en")
  }
}
`.trim();
  }

  return `
SELECT DISTINCT ?item ?coord ?label WHERE {
  ?item wdt:P17 wd:${def.countryQid} ;
        wdt:P625 ?coord .
  wd:${typeQid} ^wdt:P279*/^wdt:P31 ?item .
  ${closed}
  ${extra}
  OPTIONAL {
    ?item rdfs:label ?label .
    FILTER(LANG(?label) = "en")
  }
}
`.trim();
}

/**
 * @param {{
 *   packId: string,
 *   root: string,
 *   args: { poi: boolean, seaLevel: boolean, category: string | null, sanitizeDisk: boolean },
 * }} opts
 */
export async function fillPack({ packId, root, args }) {
  const def = PACK_DEFS[packId];
  if (!def) {
    throw new Error(`Unknown pack: ${packId}. Known: ${KNOWN_PACK_IDS.join(", ")}`);
  }
  const mapping = resolvePackMapping(packId, root);
  const { poiDir, seaLevelPath, ua } = mapping;

  const jiti = createJiti(import.meta.url, {
    alias: { "@": path.join(root, "src") },
  });
  const { sanitizeBundledPoiPlaces } = jiti(
    path.join(root, "src/services/geo/overpass/bundledPoiHygiene.ts"),
  );
  const { REGION_PACK_REFERENCE_BBOXES } = jiti(
    path.join(root, "src/domain/regions/packGeoManifest.ts"),
  );
  const { PACK_SEA_LEVEL_SEED_DIVISIONS } = jiti(
    path.join(root, "src/domain/geometry/measuring/seaLevel.ts"),
  );
  const { OPEN_METEO_ELEVATION_ENDPOINT } = jiti(
    path.join(root, "src/services/geo/elevation/constants.ts"),
  );

  const packBbox = REGION_PACK_REFERENCE_BBOXES[mapping.bboxKey];
  if (!packBbox) {
    throw new Error(`REGION_PACK_REFERENCE_BBOXES.${mapping.bboxKey} missing`);
  }

  async function sparql(query, attempt = 1) {
    const url = `${WDQS}?${new URLSearchParams({ query, format: "json" })}`;
    const res = await fetch(url, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": ua },
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

  async function fetchCategoryPlaces(category, config) {
    const byId = new Map();
    for (const typeQid of config.types) {
      process.stdout.write(`  WDQS ${category} ← ${typeQid}… `);
      const data = await sparql(buildCategoryQuery(def, packBbox, typeQid, config.extra ?? ""));
      let added = 0;
      for (const row of data.results.bindings) {
        const id = row.item.value.split("/").pop();
        if (!id || !/^Q\d+$/.test(id)) continue;
        const point = parseWktPoint(row.coord?.value ?? "");
        if (!point || !inBbox(point.lat, point.lng, packBbox)) continue;
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
    const rank = Object.fromEntries(def.labelLangs.map((lang, i) => [lang, i]));
    const langList = def.labelLangs.map((l) => `"${l}"`).join(", ");
    for (let i = 0; i < missing.length; i += 50) {
      const batch = missing.slice(i, i + 50);
      const values = batch.map((qid) => `wd:${qid}`).join(" ");
      const query = `
SELECT ?item ?label WHERE {
  VALUES ?item { ${values} }
  ?item rdfs:label ?label .
  FILTER(LANG(?label) IN (${langList}))
}
`.trim();
      const data = await sparql(query);
      const best = new Map();
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

  async function writePoiCategory(category, places) {
    const payload =
      places.length === 0
        ? { category, source: "none", places: [] }
        : {
            category,
            source: "wikidata",
            bbox: packBbox,
            places: places
              .map((p) => ({
                id: p.id,
                name: p.name,
                lat: Number(p.lat.toFixed(6)),
                lng: Number(p.lng.toFixed(6)),
              }))
              .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
          };
    await writeFile(path.join(poiDir, `${category}.json`), compactJson(payload), "utf8");
    return payload;
  }

  async function sanitizeDiskPoi() {
    for (const category of Object.keys(CATEGORIES)) {
      const filePath = path.join(poiDir, `${category}.json`);
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
        const res = await fetch(url, { headers: { "User-Agent": ua } });
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
    const cells = buildSeedCells(packBbox, PACK_SEA_LEVEL_SEED_DIVISIONS);
    const cellElevations = await fetchElevations(cells.map((c) => c.point));
    const finite = cellElevations.filter((v) => Number.isFinite(v)).length;
    if (finite !== cells.length) {
      throw new Error(`sea_level incomplete: ${finite}/${cells.length} finite`);
    }
    const payload = {
      source: "open-meteo",
      bbox: packBbox,
      divisions: PACK_SEA_LEVEL_SEED_DIVISIONS,
      cells,
      cellElevations,
      complete: true,
    };
    await writeFile(seaLevelPath, compactJson(payload), "utf8");
    console.log(`sea_level_seed: ${cells.length} cells, complete=true`);
  }

  await mkdir(poiDir, { recursive: true });

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
