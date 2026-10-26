/**
 * Distinct local planning-area marks (no Wikidata P41/P94 on URA areas). Run before flag sync.
 */
import { SINGAPORE_PLANNING_AREAS } from "../geo/singapore-planning-area-table.mjs";
import { createLocalInitialFlagPack } from "./create-local-initial-flag-pack.mjs";

function initials(name) {
  const stop = new Set(["of", "and", "the"]);
  const parts = name.split(/\s+/).filter((part) => !stop.has(part.toLowerCase()));
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const pack = createLocalInitialFlagPack({
  rows: SINGAPORE_PLANNING_AREAS,
  identityPrefix: "singapore-planning",
  altSuffix: "Planning Area",
  initials,
});

export const ensureSingaporePlanningOverridePngs = pack.ensureOverridePngs;
export const SINGAPORE_PLANNING_FLAG_OVERRIDES = pack.FLAG_OVERRIDES;
