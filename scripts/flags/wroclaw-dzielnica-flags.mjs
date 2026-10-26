/**
 * Distinct local dzielnica marks (official osiedla lack Wikidata P41/P94). Run before flag sync.
 */
import { WROCLAW_DZIELNICE } from "../geo/wroclaw-dzielnica-table.mjs";
import { createLocalInitialFlagPack } from "./create-local-initial-flag-pack.mjs";

function initials(name) {
  const stop = new Set(["-", "–"]);
  const parts = name.split(/\s+/).filter((part) => !stop.has(part));
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const pack = createLocalInitialFlagPack({
  rows: WROCLAW_DZIELNICE,
  identityPrefix: "wroclaw-dzielnica",
  altSuffix: "Dzielnica",
  initials,
});

export const ensureWroclawDzielnicaOverridePngs = pack.ensureOverridePngs;
export const WROCLAW_DZIELNICA_FLAG_OVERRIDES = pack.FLAG_OVERRIDES;
