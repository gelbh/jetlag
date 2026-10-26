/**
 * Distinct local stadsdeel marks (borough arms not consistently on Wikidata P41). Run before flag sync.
 */
import { AMSTERDAM_STADSDELEN } from "../geo/amsterdam-stadsdeel-table.mjs";
import { createLocalInitialFlagPack } from "./create-local-initial-flag-pack.mjs";

const pack = createLocalInitialFlagPack({
  rows: AMSTERDAM_STADSDELEN,
  identityPrefix: "amsterdam-stadsdeel",
  altSuffix: "Stadsdeel",
});

export const ensureAmsterdamStadsdeelOverridePngs = pack.ensureOverridePngs;
export const AMSTERDAM_STADSDEL_FLAG_OVERRIDES = pack.FLAG_OVERRIDES;
