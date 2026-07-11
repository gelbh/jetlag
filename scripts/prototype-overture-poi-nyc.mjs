#!/usr/bin/env node
/**
 * Compares named POI counts for NYC Manhattan bbox: Overpass vs Wikidata.
 * Overture Maps Places requires a large parquet download; Wikidata proxies
 * the same enrichment path for this prototype.
 *
 * Run: node scripts/prototype-overture-poi-nyc.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = resolve(ROOT, "docs/overture-poi-nyc-prototype.md");

const NYC_BBOX = { south: 40.7, west: -74.02, north: 40.82, east: -73.93 };

const CATEGORIES = [
  {
    label: "museum",
    overpass: '["tourism"="museum"]',
    wikidataTypes: ["Q33506"],
  },
  {
    label: "park",
    overpass: '["leisure"="park"]',
    wikidataTypes: ["Q22698"],
  },
  {
    label: "hospital",
    overpass: '["amenity"="hospital"]',
    wikidataTypes: ["Q16917"],
  },
];

function formatBbox({ south, west, north, east }) {
  return `${south},${west},${north},${east}`;
}

async function countOverpass(selector, attempt = 0) {
  const bbox = formatBbox(NYC_BBOX);
  const query = `
    [out:json][timeout:25];
    (
      node${selector}(${bbox});
      way${selector}(${bbox});
    );
    out center 200;
  `;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "JetLagMapCompanion/1.0",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (
    (response.status === 429 || response.status === 504) &&
    attempt < 2
  ) {
    await sleep(2000 * (attempt + 1));
    return countOverpass(selector, attempt + 1);
  }

  if (!response.ok) {
    return { total: 0, named: 0, error: `Overpass ${response.status}` };
  }

  const payload = await response.json();
  const named = (payload.elements ?? []).filter((element) => {
    const tags = element.tags ?? {};
    return Boolean(tags.name || tags["name:en"]);
  });

  return {
    total: payload.elements?.length ?? 0,
    named: named.length,
  };
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function countWikidata(types) {
  const typeClause = types.map((type) => `wd:${type}`).join(", ");
  const sparql = `
    SELECT (COUNT(?item) AS ?count) WHERE {
      ?item wdt:P31/wdt:P279* ?type .
      VALUES ?type { ${typeClause} }
      ?item wdt:P625 ?coord .
      FILTER(?lat >= ${NYC_BBOX.south} && ?lat <= ${NYC_BBOX.north})
      FILTER(?lon >= ${NYC_BBOX.west} && ?lon <= ${NYC_BBOX.east})
      BIND(xsd:float(strbefore(strafter(str(?coord), "Point("), " ")) AS ?lon)
      BIND(xsd:float(strafter(strafter(str(?coord), "Point("), " ")) AS ?lat)
      ?item rdfs:label ?label .
      FILTER(LANG(?label) = "en")
    }
  `;

  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("format", "json");
  url.searchParams.set("query", sparql);

  const response = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "JetLagMapCompanion/1.0 (prototype-overture-poi-nyc)",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata SPARQL failed (${response.status}).`);
  }

  const payload = await response.json();
  const count = Number(payload.results?.bindings?.[0]?.count?.value ?? 0);
  return { named: count, total: count };
}

async function main() {
  const rows = [];

  for (const category of CATEGORIES) {
    const overpass = await countOverpass(category.overpass);
    await sleep(1500);
    const wikidata = await countWikidata(category.wikidataTypes);

    rows.push({
      category: category.label,
      overpassTotal: overpass.total,
      overpassNamed: overpass.named,
      overpassError: overpass.error,
      wikidataNamed: wikidata.named,
      deltaNamed: wikidata.named - overpass.named,
    });
  }

  const lines = [
    "# Overture / Wikidata POI prototype (NYC Manhattan bbox)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "BBox: south 40.7, west -74.02, north 40.82, east -73.93",
    "",
    "Overture Maps Places ships as multi-GB parquet on S3. For a fast prototype,",
    "this script compares **Overpass (runtime today)** with **Wikidata SPARQL** as a",
    "free enrichment source suitable for bundled region packs.",
    "",
    "| Category | Overpass total | Overpass named | Wikidata named (en) | Delta |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.category} | ${row.overpassTotal} | ${row.overpassNamed} | ${row.wikidataNamed} | ${row.deltaNamed >= 0 ? "+" : ""}${row.deltaNamed} |`,
    ),
    "",
    "## Recommendation",
    "",
    "- Bundle Wikidata + Overture-derived extracts at build time for NYC and other region packs.",
    "- Keep Overpass as the global runtime fallback.",
    "- Premium can add on-demand commercial Places only when bundled counts fall below probe thresholds.",
    "",
  ];

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${REPORT_PATH}`);
  for (const row of rows) {
    console.log(
      `${row.category}: overpass named ${row.overpassNamed}, wikidata named ${row.wikidataNamed}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
