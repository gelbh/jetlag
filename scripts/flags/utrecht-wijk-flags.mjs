/**
 * Distinct local wijk marks (official wijken lack Wikidata P41/P94). Run before flag sync.
 */
import { UTRECHT_WIJKEN } from "../geo/utrecht-wijk-table.mjs";
import { createLocalInitialFlagPack } from "./create-local-initial-flag-pack.mjs";

const pack = createLocalInitialFlagPack({
  rows: UTRECHT_WIJKEN,
  identityPrefix: "utrecht-wijk",
  altSuffix: "Wijk",
});

export const ensureUtrechtWijkOverridePngs = pack.ensureOverridePngs;
export const UTRECHT_WIJK_FLAG_OVERRIDES = pack.FLAG_OVERRIDES;
