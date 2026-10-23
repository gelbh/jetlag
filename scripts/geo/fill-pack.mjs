#!/usr/bin/env node
/**
 * Fill a pack's gameplay geo stubs (POI via WDQS, sea_level_seed via Open-Meteo).
 *
 * Hygiene uses the canonical TS module (jiti):
 *   src/services/geo/overpass/bundledPoiHygiene.ts
 *
 * Usage:
 *   node scripts/geo/fill-pack.mjs --pack switzerland
 *   node scripts/geo/fill-pack.mjs --pack australia --poi-only
 *   node scripts/geo/fill-pack.mjs --pack southampton --sea-level-only
 *   node scripts/geo/fill-pack.mjs --pack switzerland --category museum
 *   node scripts/geo/fill-pack.mjs --pack switzerland --sanitize-disk
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fillPack, KNOWN_PACK_IDS } from "./fill-pack-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function printHelp() {
  console.log(`Fill pack POI + sea_level_seed geo stubs.

Usage:
  node scripts/geo/fill-pack.mjs --pack <id> [options]

Packs: ${KNOWN_PACK_IDS.join(", ")}

Options:
  --pack <id>          Required. Pack to fill.
  --poi-only           Skip sea_level_seed
  --sea-level-only     Skip POI fetch
  --category <name>    Single POI category (implies skip sea_level)
  --sanitize-disk      Re-apply hygiene to on-disk POI JSON (no network)
  --help, -h           Show this help
`);
}

function parseArgs(argv) {
  const args = {
    pack: null,
    poi: true,
    seaLevel: true,
    category: null,
    sanitizeDisk: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      args.help = true;
    } else if (a === "--pack") {
      args.pack = argv[++i] ?? null;
    } else if (a === "--poi-only") {
      args.seaLevel = false;
    } else if (a === "--sea-level-only") {
      args.poi = false;
    } else if (a === "--sanitize-disk") {
      args.sanitizeDisk = true;
      args.poi = false;
      args.seaLevel = false;
    } else if (a === "--category") {
      args.category = argv[++i] ?? null;
      args.seaLevel = false;
    } else {
      console.error(`Unknown flag: ${a}`);
      printHelp();
      process.exit(1);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.pack) {
    console.error("Missing --pack <id>");
    printHelp();
    process.exit(1);
  }

  await fillPack({
    packId: args.pack,
    root: ROOT,
    args: {
      poi: args.poi,
      seaLevel: args.seaLevel,
      category: args.category,
      sanitizeDisk: args.sanitizeDisk,
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
