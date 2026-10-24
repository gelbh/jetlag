#!/usr/bin/env node
/**
 * Slice national Australia pack POI JSON into per-state trees for bandwidth.
 *
 * Uses REGION_PACK_SUBREGION_REFERENCE_BBOXES.australia AABBs (inclusive).
 * Places that fall outside all state bboxes stay national-only.
 *
 * Usage:
 *   node scripts/slice-australia-poi-by-state.mjs
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const POI_DIR = join(ROOT, "public/geo/australia/poi");
const STATES = ["nsw", "vic", "qld", "sa", "wa", "tas", "nt", "act"];

/** Mirrors src/domain/regions/subregionReferenceBboxes.ts australia entries. */
const STATE_BBOXES = {
  act: { south: -35.9205, west: 148.7628, north: -35.1244, east: 149.3993 },
  nsw: { south: -37.5051, west: 140.9993, north: -28.1569, east: 159.1092 },
  nt: { south: -25.9986, west: 129.0006, north: -10.9068, east: 137.9991 },
  qld: { south: -29.1793, west: 137.9946, north: -9.1425, east: 153.5522 },
  sa: { south: -38.0626, west: 129.0018, north: -25.9964, east: 141.003 },
  tas: { south: -43.7404, west: 143.8192, north: -39.2038, east: 148.4986 },
  vic: { south: -39.159, west: 140.9619, north: -33.9806, east: 149.9762 },
  wa: { south: -35.1916, west: 112.9211, north: -13.6887, east: 129.0019 },
};

function pointInBbox(lat, lng, bbox) {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

function placesInState(places, stateId) {
  const bbox = STATE_BBOXES[stateId];
  return places.filter((place) => pointInBbox(place.lat, place.lng, bbox));
}

function main() {
  if (!existsSync(POI_DIR)) {
    throw new Error(`Missing ${POI_DIR}`);
  }

  const categoryFiles = readdirSync(POI_DIR).filter(
    (name) => name.endsWith(".json") && !STATES.includes(name.replace(/\.json$/, "")),
  );

  for (const stateId of STATES) {
    mkdirSync(join(POI_DIR, stateId), { recursive: true });
  }

  let totalPlaces = 0;
  for (const fileName of categoryFiles) {
    const category = fileName.replace(/\.json$/, "");
    const national = JSON.parse(readFileSync(join(POI_DIR, fileName), "utf8"));
    const places = Array.isArray(national.places) ? national.places : [];
    totalPlaces += places.length;

    for (const stateId of STATES) {
      const slicedPlaces = placesInState(places, stateId);
      const bbox = STATE_BBOXES[stateId];
      const out = {
        category: national.category ?? category,
        source: slicedPlaces.length > 0 ? (national.source ?? "wikidata") : "none",
        bbox,
        places: slicedPlaces,
      };
      writeFileSync(join(POI_DIR, stateId, fileName), `${JSON.stringify(out)}\n`, "utf8");
    }
  }

  console.log(
    `Sliced ${categoryFiles.length} categories (${totalPlaces} national places) into ${STATES.length} state trees under ${POI_DIR}/<stateId>/`,
  );
}

main();
