#!/usr/bin/env node
/**
 * One-shot multi-metro GTFS rebuild (no Transitland API key required).
 *
 * Downloads public agency / Mobility Database / BODS zips into `.cache/gtfs-rebuild/`,
 * then invokes `scripts/geo/build-gtfs-static-graph.mjs --metro <id> --local-zip …` for each
 * shipped GTFS metro. Presets without a GTFS metro (tokyo / osaka / swiss) are listed
 * as skipped.
 *
 * Usage:
 *   node scripts/geo/rebuild-gtfs-metros.mjs
 *   node scripts/geo/rebuild-gtfs-metros.mjs --metro nyc,london
 *   node scripts/geo/rebuild-gtfs-metros.mjs --skip-download   # reuse cached zips
 *   node scripts/geo/rebuild-gtfs-metros.mjs --dry-run
 *
 * Env:
 *   GTFS_REBUILD_CACHE   override cache dir (default: <repo>/.cache/gtfs-rebuild)
 *   TRANSITLAND_API_KEY  optional; only used if a metro declares transitlandFeedIds
 */
import { spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BUILD_SCRIPT = resolve(ROOT, "scripts/geo/build-gtfs-static-graph.mjs");
const MANIFEST_PATH = resolve(ROOT, "public/geo/gtfs/manifest.json");
const BIOME_PATH = resolve(ROOT, "biome.json");
const CACHE_DIR = process.env.GTFS_REBUILD_CACHE?.trim() || resolve(ROOT, ".cache/gtfs-rebuild");
const MDB = "https://storage.googleapis.com/mdb-latest";
const TFI = "https://www.transportforireland.ie/transitData/Data";
const MTA = "http://web.mta.info/developers/data/nyct";

/** @typedef {{ name: string, url: string }} ZipSource */

/**
 * Sources for every shipped GTFS metro. Prefer stable agency URLs; fall back to
 * Mobility Database (`mdb-latest`) mirrors when the agency has no direct zip.
 *
 * @type {Record<string, { feedOnestopId: string, sources: ZipSource[], optional?: boolean, note?: string }>}
 */
const METRO_SOURCES = {
  chicago: {
    feedOnestopId: "cta-google-transit",
    sources: [
      {
        name: "cta-google-transit.zip",
        url: "https://www.transitchicago.com/downloads/sch_data/google_transit.zip",
      },
    ],
  },
  dublin: {
    feedOnestopId: "tfi-dublin-merged",
    sources: [
      { name: "GTFS_Dublin_Bus.zip", url: `${TFI}/GTFS_Dublin_Bus.zip` },
      { name: "GTFS_GoAhead.zip", url: `${TFI}/GTFS_GoAhead.zip` },
      { name: "GTFS_Irish_Rail.zip", url: `${TFI}/GTFS_Irish_Rail.zip` },
      {
        name: "ie-dublin-luas-gtfs-2638.zip",
        url: `${MDB}/ie-dublin-luas-gtfs-2638.zip`,
      },
    ],
  },
  london: {
    feedOnestopId: "mdb-tfl-995",
    sources: [
      {
        name: "gb-westminster-transport-for-london-gtfs-995.zip",
        url: `${MDB}/gb-westminster-transport-for-london-gtfs-995.zip`,
      },
    ],
    note: "MDB TfL mirror; bus density still may need BODS later if thin.",
  },
  nyc: {
    feedOnestopId: "mta-nyc-subway-bus-merged",
    sources: [
      {
        name: "google_transit_subway.zip",
        url: `${MTA}/subway/google_transit.zip`,
      },
      {
        name: "google_transit_manhattan.zip",
        url: `${MTA}/bus/google_transit_manhattan.zip`,
      },
      {
        name: "google_transit_brooklyn.zip",
        url: `${MTA}/bus/google_transit_brooklyn.zip`,
      },
      {
        name: "google_transit_queens.zip",
        url: `${MTA}/bus/google_transit_queens.zip`,
      },
      {
        name: "google_transit_bronx.zip",
        url: `${MTA}/bus/google_transit_bronx.zip`,
      },
      {
        name: "google_transit_staten_island.zip",
        url: `${MTA}/bus/google_transit_staten_island.zip`,
      },
    ],
  },
  "portland-maine": {
    feedOnestopId: "mdb-gpmetro-south-portland",
    sources: [
      {
        name: "us-maine-greater-portland-metro-bus-gtfs-2642.zip",
        url: `${MDB}/us-maine-greater-portland-metro-bus-gtfs-2642.zip`,
      },
      {
        name: "us-maine-south-portland-gtfs-2641.zip",
        url: `${MDB}/us-maine-south-portland-gtfs-2641.zip`,
      },
    ],
  },
  "prince-rupert": {
    feedOnestopId: "f-bctransit~prince~rupert",
    sources: [],
    optional: true,
    note: "No public zip found without Transitland; keep existing bundle.",
  },
  sf: {
    feedOnestopId: "mdb-sfmta-2886",
    sources: [
      {
        name: "us-california-san-francisco-municipal-transportation-agency-sfmta-gtfs-2886.zip",
        url: `${MDB}/us-california-san-francisco-municipal-transportation-agency-sfmta-gtfs-2886.zip`,
      },
    ],
  },
  southampton: {
    feedOnestopId: "f-bus~dft~gov~uk",
    sources: [],
    optional: true,
    note: "Keep existing bundle. BODS ITM South East has almost no Southampton local stops; prior DFT extract stays until a better source lands.",
  },
};

/** Presets that have no GTFS metro wiring today. */
const PRESETS_WITHOUT_GTFS = ["tokyo", "osaka", "swiss"];

function parseArgs(argv) {
  const args = {
    metros: null,
    skipDownload: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--skip-download") {
      args.skipDownload = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--metro") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--metro requires a comma-separated id list");
      }
      args.metros = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        `Usage: node scripts/geo/rebuild-gtfs-metros.mjs [--metro a,b] [--skip-download] [--dry-run]`,
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function loadManifestStopCounts() {
  if (!existsSync(MANIFEST_PATH)) {
    return new Map();
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  return new Map(
    (manifest.metros ?? []).map((entry) => [
      entry.id,
      { stopCount: entry.stopCount, feedOnestopId: entry.feedOnestopId },
    ]),
  );
}

async function downloadFile(url, destPath, { retries = 4 } = {}) {
  mkdirSync(dirname(destPath), { recursive: true });
  const tmpPath = `${destPath}.partial`;
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "user-agent": "jetlag-gtfs-rebuild/1.0" },
      });
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      await pipeline(Readable.fromWeb(response.body), createWriteStream(tmpPath));
      const size = statSync(tmpPath).size;
      if (size < 1024) {
        throw new Error(`Downloaded file too small (${size} B): ${url}`);
      }
      renameSync(tmpPath, destPath);
      return size;
    } catch (error) {
      lastError = error;
      console.warn(`  download attempt ${attempt}/${retries} failed: ${error.message}`);
      await new Promise((resolveWait) => setTimeout(resolveWait, 1500 * attempt));
    }
  }
  throw lastError;
}

function excludeLargeGtfsFromBiome() {
  const gtfsDir = resolve(ROOT, "public/geo/gtfs");
  const biome = JSON.parse(readFileSync(BIOME_PATH, "utf8"));
  const maxBytes = 1024 * 1024;
  const needed = [];
  for (const name of [
    "chicago.json",
    "dublin.json",
    "nyc.json",
    "london.json",
    "sf.json",
    "southampton.json",
  ]) {
    const path = join(gtfsDir, name);
    if (existsSync(path) && statSync(path).size > maxBytes) {
      needed.push(`!public/geo/gtfs/${name}`);
    }
  }
  if (needed.length === 0) {
    return;
  }
  const ensure = (list) => {
    for (const entry of needed) {
      if (!list.includes(entry)) {
        list.push(entry);
      }
    }
  };
  ensure(biome.files.includes);
  ensure(biome.linter.includes);
  writeFileSync(BIOME_PATH, `${JSON.stringify(biome, null, 2)}\n`, "utf8");
  console.log(`Patched biome.json excludes: ${needed.join(", ")}`);
}

function runBuilder(metroId, zipPaths) {
  const args = [BUILD_SCRIPT, "--metro", metroId];
  for (const zipPath of zipPaths) {
    args.push("--local-zip", zipPath);
  }
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=8192",
    },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Builder failed for ${metroId} (exit ${result.status})`);
  }
}

async function rebuildMetro(metroId, config, { skipDownload, dryRun }) {
  console.log(`\n=== ${metroId} (${config.feedOnestopId}) ===`);
  if (config.note) {
    console.log(`  note: ${config.note}`);
  }
  if (config.sources.length === 0) {
    console.log("  skip: no downloadable sources configured (keep existing bundle)");
    return { metroId, status: "kept", reason: "no-sources" };
  }

  const metroCache = join(CACHE_DIR, metroId);
  mkdirSync(metroCache, { recursive: true });
  const zipPaths = [];

  for (const source of config.sources) {
    const dest = join(metroCache, source.name);
    if (skipDownload && existsSync(dest) && statSync(dest).size > 1024) {
      console.log(`  cache hit ${source.name} (${statSync(dest).size} B)`);
    } else if (dryRun) {
      console.log(`  dry-run would download ${source.url}`);
    } else {
      console.log(`  downloading ${source.name}…`);
      const size = await downloadFile(source.url, dest);
      console.log(`  saved ${source.name} (${(size / 1e6).toFixed(1)} MB)`);
    }
    zipPaths.push(dest);
  }

  if (dryRun) {
    return { metroId, status: "dry-run" };
  }

  runBuilder(metroId, zipPaths);
  return { metroId, status: "rebuilt" };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const before = loadManifestStopCounts();
  const metroIds = args.metros ?? Object.keys(METRO_SOURCES);

  console.log(`GTFS multi-metro rebuild`);
  console.log(`  root: ${ROOT}`);
  console.log(`  cache: ${CACHE_DIR}`);
  console.log(`  metros: ${metroIds.join(", ")}`);
  console.log(`  presets without GTFS (skip): ${PRESETS_WITHOUT_GTFS.join(", ")}`);

  if (!existsSync(BUILD_SCRIPT)) {
    throw new Error(`Missing ${BUILD_SCRIPT}`);
  }

  mkdirSync(CACHE_DIR, { recursive: true });

  const results = [];
  for (const metroId of metroIds) {
    const config = METRO_SOURCES[metroId];
    if (!config) {
      console.warn(`\n=== ${metroId} ===\n  skip: unknown metro (not in METRO_SOURCES)`);
      results.push({ metroId, status: "unknown" });
      continue;
    }
    try {
      results.push(await rebuildMetro(metroId, config, args));
    } catch (error) {
      if (config.optional) {
        console.warn(`  optional fail, keeping existing: ${error.message}`);
        results.push({ metroId, status: "kept", reason: error.message });
      } else {
        console.error(`  FAILED: ${error.message}`);
        results.push({ metroId, status: "failed", reason: error.message });
      }
    }
  }

  if (!args.dryRun) {
    excludeLargeGtfsFromBiome();
  }

  const after = loadManifestStopCounts();
  console.log("\nBefore → after (stop counts)");
  console.log("metro\tbefore\tafter\tfeed");
  for (const metroId of metroIds) {
    const b = before.get(metroId)?.stopCount ?? "-";
    const a = after.get(metroId)?.stopCount ?? "-";
    const feed = after.get(metroId)?.feedOnestopId ?? METRO_SOURCES[metroId]?.feedOnestopId ?? "-";
    const status = results.find((row) => row.metroId === metroId)?.status ?? "?";
    console.log(`${metroId}\t${b}\t${a}\t${feed}\t${status}`);
  }

  const failed = results.filter((row) => row.status === "failed");
  if (failed.length > 0) {
    console.error(`\n${failed.length} metro(s) failed.`);
    process.exit(1);
  }
  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
