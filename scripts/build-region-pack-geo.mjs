#!/usr/bin/env node
/**
 * Builds public/geo/{pack} assets for bundled region packs.
 * Run: node scripts/build-region-pack-geo.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import bbox from "@turf/bbox";
import bboxPolygon from "@turf/bbox-polygon";
import booleanIntersects from "@turf/boolean-intersects";
import intersect from "@turf/intersect";
import { featureCollection, multiPolygon, polygon } from "@turf/helpers";
import simplify from "@turf/simplify";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GEO = resolve(ROOT, "public/geo");

const NYC_BOROUGH_MAP = {
  1: { id: "manhattan", name: "Manhattan" },
  2: { id: "bronx", name: "Bronx" },
  3: { id: "brooklyn", name: "Brooklyn" },
  4: { id: "queens", name: "Queens" },
  5: { id: "staten-island", name: "Staten Island" },
};

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeJsonCompact(path, data);
}

function writeJsonCompact(path, data) {
  writeFileSync(path, `${JSON.stringify(data)}\n`, "utf8");
}

function simplifyCollection(collection, tolerance = 0.0008) {
  return featureCollection(
    collection.features.map((feature) =>
      simplify(feature, { tolerance, highQuality: true }),
    ),
  );
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function toFeatureCollection(features) {
  return featureCollection(features.filter(Boolean));
}

function quadrantAreas(parentFeature, parentId, parentName) {
  const box = bbox(parentFeature);
  const [minX, minY, maxX, maxY] = box;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const quads = [
    { suffix: "NW", coords: [minX, midY, midX, maxY] },
    { suffix: "NE", coords: [midX, midY, maxX, maxY] },
    { suffix: "SW", coords: [minX, minY, midX, midY] },
    { suffix: "SE", coords: [midX, minY, maxX, midY] },
  ];

  return quads
    .map(({ suffix, coords }) => {
      const clip = bboxPolygon(coords);
      const clipped = intersect(featureCollection([parentFeature, clip]));
      if (!clipped) {
        return null;
      }
      return {
        ...clipped,
        properties: {
          name: `${parentName} (${suffix})`,
          areaId: `${parentId}-${suffix.toLowerCase()}`,
          parentId,
        },
      };
    })
    .filter(Boolean);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed ${url}: ${response.status}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed ${url}: ${response.status}`);
  }
  return response.text();
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

const NYC_POI_BBOX = { south: 40.49, west: -74.26, north: 40.92, east: -73.7 };

const NYC_POI_CATEGORIES = [
  { id: "museum", wikidataTypes: ["Q33506"] },
  { id: "park", wikidataTypes: ["Q22698"] },
  { id: "hospital", wikidataTypes: ["Q16917"] },
  { id: "mountain", wikidataTypes: ["Q8502"] },
  { id: "commercial_airport", wikidataTypes: ["Q1248784"] },
  { id: "rail_station", wikidataTypes: ["Q55488"] },
];

function buildWikidataPoiQuery(wikidataTypes, bbox) {
  const typeClause = wikidataTypes.map((type) => `wd:${type}`).join(", ");

  return `
    SELECT ?item ?itemLabel ?lat ?lon WHERE {
      ?item wdt:P31/wdt:P279* ?type .
      VALUES ?type { ${typeClause} }
      ?item p:P625 ?coordStatement .
      ?coordStatement ps:P625 ?coord .
      BIND(geof:latitude(?coord) AS ?lat)
      BIND(geof:longitude(?coord) AS ?lon)
      FILTER(?lat >= ${bbox.south} && ?lat <= ${bbox.north})
      FILTER(?lon >= ${bbox.west} && ?lon <= ${bbox.east})
      ?item rdfs:label ?itemLabel .
      FILTER(LANG(?itemLabel) = "en")
    }
    LIMIT 2000
  `;
}

async function fetchWikidataPois(wikidataTypes, bbox) {
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("format", "json");
  url.searchParams.set("query", buildWikidataPoiQuery(wikidataTypes, bbox));

  const response = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "JetLagMapCompanion/1.0 (build-region-pack-geo)",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata SPARQL failed (${response.status}).`);
  }

  const payload = await response.json();
  const bindings = payload.results?.bindings ?? [];
  const seen = new Set();
  const places = [];

  for (const row of bindings) {
    const itemUri = row.item?.value;
    const qid = itemUri?.split("/").pop();
    const name = row.itemLabel?.value?.trim();
    const lat = Number(row.lat?.value);
    const lng = Number(row.lon?.value);

    if (!qid || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    if (seen.has(qid)) {
      continue;
    }

    seen.add(qid);
    places.push({ id: qid, name, lat, lng });
  }

  return places;
}

async function buildNycPoiBundles() {
  for (const category of NYC_POI_CATEGORIES) {
    const places = await fetchWikidataPois(category.wikidataTypes, NYC_POI_BBOX);
    writeJson(resolve(GEO, `nyc/poi/${category.id}.json`), {
      category: category.id,
      source: "wikidata",
      bbox: NYC_POI_BBOX,
      places,
    });
    console.log("nyc poi:", category.id, places.length, "places");
    await sleep(1500);
  }
}

async function buildNyc() {
  const rawBoroughs = JSON.parse(
    readFileSync("/tmp/nyc-boroughs.json", "utf8"),
  );
  const boroughFeatures = rawBoroughs.features.map((feature) => {
    const code = Number(feature.properties.borocode);
    const meta = NYC_BOROUGH_MAP[code];
    return {
      ...feature,
      properties: {
        name: meta.name,
        boroughId: meta.id,
      },
    };
  });
  const boroughs = simplifyCollection(toFeatureCollection(boroughFeatures));
  writeJson(resolve(GEO, "nyc/boroughs.geojson"), boroughs);

  const rawDistricts = JSON.parse(readFileSync("/tmp/nyc-cd.json", "utf8"));
  const districtFeatures = rawDistricts.features
    .map((feature) => {
      const boroCd = String(feature.properties.BoroCD ?? "");
      const boroughCode = Number(boroCd.charAt(0));
      const meta = NYC_BOROUGH_MAP[boroughCode];
      if (!meta) {
        return null;
      }
      const districtNum = boroCd.slice(1).replace(/^0+/, "") || "0";
      return {
        ...feature,
        properties: {
          name: `${meta.name} CD ${districtNum}`,
          districtId: `${meta.id}-cd-${districtNum}`,
          boroughId: meta.id,
        },
      };
    })
    .filter(Boolean);
  const districts = simplifyCollection(toFeatureCollection(districtFeatures));
  writeJson(resolve(GEO, "nyc/districts.geojson"), districts);

  for (const meta of Object.values(NYC_BOROUGH_MAP)) {
    const scoped = toFeatureCollection(
      districts.features.filter(
        (feature) => feature.properties.boroughId === meta.id,
      ),
    );
    writeJson(resolve(GEO, `nyc/districts/${meta.id}.geojson`), scoped);
  }

  writeFileSync(
    resolve(GEO, "nyc/ATTRIBUTION.txt"),
    "NYC borough boundaries: NYC Open Data (CC0)\nNYC community districts: NYC Department of City Planning via ArcGIS\nNYC POI bundles: Wikidata (CC0)\n",
    "utf8",
  );
  console.log("nyc:", boroughs.features.length, "boroughs,", districts.features.length, "districts");
  await buildNycPoiBundles();
}

async function buildLondon() {
  const inner = await fetchJson(
    "https://api.github.com/repos/utisz/compound-cities/contents/greater-london/inner-london",
  );
  const outer = await fetchJson(
    "https://api.github.com/repos/utisz/compound-cities/contents/greater-london/outer-london",
  );
  const files = [...inner, ...outer].filter((entry) =>
    entry.name.endsWith(".geo.json"),
  );

  const boroughFeatures = [];
  for (const file of files) {
    const slug = file.name.replace(".geo.json", "");
    const feature = await fetchJson(file.download_url);
    const name = normalizeName(
      feature.properties?.name ?? slug.replace(/-/g, " "),
    );
    boroughFeatures.push({
      ...feature,
      properties: {
        name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
        boroughId: slug,
      },
    });
  }

  const boroughs = simplifyCollection(toFeatureCollection(boroughFeatures), 0.001);
  writeJson(resolve(GEO, "london/boroughs.geojson"), boroughs);

  const areaFeatures = [];
  for (const borough of boroughs.features) {
    areaFeatures.push(
      ...quadrantAreas(
        borough,
        borough.properties.boroughId,
        borough.properties.name,
      ),
    );
  }
  const areas = simplifyCollection(toFeatureCollection(areaFeatures), 0.0005);
  writeJson(resolve(GEO, "london/areas.geojson"), areas);

  for (const borough of boroughs.features) {
    const boroughId = borough.properties.boroughId;
    const scoped = toFeatureCollection(
      areas.features.filter((feature) => feature.properties.parentId === boroughId),
    );
    writeJson(resolve(GEO, `london/areas/${boroughId}.geojson`), scoped);
  }

  writeFileSync(
    resolve(GEO, "london/ATTRIBUTION.txt"),
    "London borough boundaries: utisz/compound-cities (admin sources cited in repo)\nLocal areas: quadrant splits of borough polygons for play\n",
    "utf8",
  );
  console.log("london:", boroughs.features.length, "boroughs,", areas.features.length, "areas");
}

async function buildTokyo() {
  const wardsRaw = await fetchJson(
    "https://raw.githubusercontent.com/niiyz/JapanCityGeoJson/master/geojson/custom/tokyo23.json",
  );
  const wardFeatures = wardsRaw.features.map((feature) => {
    const name = normalizeName(feature.properties.N03_004);
    const code = String(feature.properties.N03_007 ?? "");
    const wardId = `ward-${code}`;
    return {
      ...feature,
      properties: {
        name,
        wardId,
      },
    };
  });
  const wards = simplifyCollection(toFeatureCollection(wardFeatures), 0.001);
  writeJson(resolve(GEO, "tokyo/wards.geojson"), wards);

  const areaFeatures = [];
  for (const ward of wards.features) {
    areaFeatures.push(
      ...quadrantAreas(ward, ward.properties.wardId, ward.properties.name),
    );
  }
  const areas = simplifyCollection(toFeatureCollection(areaFeatures), 0.0005);
  writeJson(resolve(GEO, "tokyo/areas.geojson"), areas);

  for (const ward of wards.features) {
    const wardId = ward.properties.wardId;
    const scoped = toFeatureCollection(
      areas.features.filter((feature) => feature.properties.parentId === wardId),
    );
    writeJson(resolve(GEO, `tokyo/areas/${wardId}.geojson`), scoped);
  }

  writeFileSync(
    resolve(GEO, "tokyo/ATTRIBUTION.txt"),
    "Tokyo ward boundaries: JapanCityGeoJson / MLIT National Land Numerical Information\nLocal areas: quadrant splits of ward polygons for play\n",
    "utf8",
  );
  console.log("tokyo:", wards.features.length, "wards,", areas.features.length, "areas");
}

async function buildOsaka() {
  const listing = await fetchJson(
    "https://api.github.com/repos/niiyz/JapanCityGeoJson/contents/geojson/27",
  );
  const wardFeatures = [];
  for (const entry of listing) {
    if (!entry.name.endsWith(".json")) {
      continue;
    }
    const collection = await fetchJson(entry.download_url);
    const feature = collection.features?.[0];
    if (!feature || feature.properties.N03_003 !== "大阪市") {
      continue;
    }
    const name = normalizeName(feature.properties.N03_004);
    const code = String(feature.properties.N03_007 ?? "");
    wardFeatures.push({
      ...feature,
      properties: {
        name,
        wardId: `ward-${code}`,
      },
    });
  }

  const wards = simplifyCollection(toFeatureCollection(wardFeatures), 0.001);
  writeJson(resolve(GEO, "osaka/wards.geojson"), wards);

  const areaFeatures = [];
  for (const ward of wards.features) {
    areaFeatures.push(
      ...quadrantAreas(ward, ward.properties.wardId, ward.properties.name),
    );
  }
  const areas = simplifyCollection(toFeatureCollection(areaFeatures), 0.0005);
  writeJson(resolve(GEO, "osaka/areas.geojson"), areas);

  for (const ward of wards.features) {
    const wardId = ward.properties.wardId;
    const scoped = toFeatureCollection(
      areas.features.filter((feature) => feature.properties.parentId === wardId),
    );
    writeJson(resolve(GEO, `osaka/areas/${wardId}.geojson`), scoped);
  }

  writeFileSync(
    resolve(GEO, "osaka/ATTRIBUTION.txt"),
    "Osaka ward boundaries: JapanCityGeoJson / MLIT National Land Numerical Information\nLocal areas: quadrant splits of ward polygons for play\n",
    "utf8",
  );
  console.log("osaka:", wards.features.length, "wards,", areas.features.length, "areas");
}

function buildSwissPack(packId, cantonName, cityDistrictName, outputNames) {
  const gadm2 = JSON.parse(readFileSync("/tmp/ch-gadm2.json", "utf8"));
  const gadm3 = JSON.parse(readFileSync("/tmp/ch-gadm3.json", "utf8"));

  const districtFeatures = gadm2.features
    .filter((feature) => feature.properties.NAME_1 === cantonName)
    .map((feature) => {
      const name = normalizeName(feature.properties.NAME_2);
      const districtId = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return {
        type: "Feature",
        geometry: feature.geometry,
        properties: {
          name,
          districtId,
        },
      };
    });

  const districts = simplifyCollection(
    toFeatureCollection(districtFeatures),
    0.002,
  );
  writeJson(resolve(GEO, `${packId}/${outputNames.primary}.geojson`), districts);

  const secondaryFeatures = gadm3.features
    .filter((feature) => {
      if (feature.properties.NAME_1 !== cantonName) {
        return false;
      }
      if (packId === "lucerne") {
        return feature.properties.NAME_2 === cityDistrictName;
      }
      return feature.properties.NAME_2 === cityDistrictName;
    })
    .map((feature) => {
      const name = normalizeName(feature.properties.NAME_3).replace(
        /([a-z])([A-Z])/g,
        "$1 $2",
      );
      const municipalityId = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const parentDistrictId = normalizeName(feature.properties.NAME_2)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return {
        type: "Feature",
        geometry: feature.geometry,
        properties: {
          name,
          municipalityId,
          districtId: parentDistrictId,
        },
      };
    });

  const secondary = simplifyCollection(
    toFeatureCollection(secondaryFeatures),
    0.001,
  );
  writeJson(resolve(GEO, `${packId}/${outputNames.secondary}.geojson`), secondary);

  for (const district of districts.features) {
    const districtId = district.properties.districtId;
    const scoped = toFeatureCollection(
      secondary.features.filter(
        (feature) => feature.properties.districtId === districtId,
      ),
    );
    if (scoped.features.length > 0) {
      writeJson(
        resolve(
          GEO,
          `${packId}/${outputNames.secondaryByDistrict}/${districtId}.geojson`,
        ),
        scoped,
      );
    }
  }

  writeFileSync(
    resolve(GEO, `${packId}/ATTRIBUTION.txt`),
    "Swiss boundaries: GADM (non-commercial use; replace with official swisstopo where needed)\n",
    "utf8",
  );
  console.log(
    packId + ":",
    districts.features.length,
    "districts,",
    secondary.features.length,
    outputNames.secondary,
  );
}

async function ensureDownloads() {
  if (!readFileSync("/tmp/nyc-boroughs.json", "utf8").includes("FeatureCollection")) {
    await fetchText("https://data.cityofnewyork.us/resource/gthc-hcne.geojson").then(
      (text) => writeFileSync("/tmp/nyc-boroughs.json", text),
    );
  }
  if (!readFileSync("/tmp/nyc-cd.json", "utf8").includes("FeatureCollection")) {
    await fetchText(
      "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/NYC_Community_Districts/FeatureServer/0/query?where=1%3D1&outFields=BoroCD&f=geojson&outSR=4326",
    ).then((text) => writeFileSync("/tmp/nyc-cd.json", text));
  }
  if (!readFileSync("/tmp/ch-gadm2.json", "utf8").includes("FeatureCollection")) {
    await fetchText(
      "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_CHE_2.json",
    ).then((text) => writeFileSync("/tmp/ch-gadm2.json", text));
  }
  if (!readFileSync("/tmp/ch-gadm3.json", "utf8").includes("FeatureCollection")) {
    await fetchText(
      "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_CHE_3.json",
    ).then((text) => writeFileSync("/tmp/ch-gadm3.json", text));
  }
}

async function main() {
  await ensureDownloads();
  await buildNyc();
  await buildLondon();
  await buildTokyo();
  await buildOsaka();
  buildSwissPack("zurich", "Zürich", "Zürich", {
    primary: "districts",
    secondary: "quarters",
    secondaryByDistrict: "quarters",
  });
  buildSwissPack("lucerne", "Lucerne", "Luzern", {
    primary: "districts",
    secondary: "municipalities",
    secondaryByDistrict: "municipalities",
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
