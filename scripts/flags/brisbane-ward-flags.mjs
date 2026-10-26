/**
 * Distinct local ward marks (no Wikidata P41/P94 per ward). Run before flag sync.
 */
import { BRISBANE_WARDS } from "../geo/brisbane-ward-table.mjs";
import { createLocalInitialFlagPack } from "./create-local-initial-flag-pack.mjs";

const pack = createLocalInitialFlagPack({
  rows: BRISBANE_WARDS,
  identityPrefix: "brisbane-ward",
  altSuffix: "Ward",
  saturation: 62,
  lightness: 42,
  initials: (name) =>
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase(),
});

export const ensureBrisbaneWardOverridePngs = pack.ensureOverridePngs;
export const BRISBANE_WARD_FLAG_OVERRIDES = pack.FLAG_OVERRIDES;
