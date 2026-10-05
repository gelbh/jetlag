import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const SWITZERLAND_REGION_PACK_ID = "switzerland" satisfies RegionPackId;

export const SWITZERLAND_GEO_ASSETS = {
  cantons: "/geo/switzerland/cantons.geojson",
  municipalities: "/geo/switzerland/municipalities.geojson",
  municipalitiesByCanton: (cantonId: string) =>
    `/geo/switzerland/municipalities/${cantonId}.geojson`,
} as const;

export const SWITZERLAND_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Canton",
    promptNoun: "canton",
    ruleSummary: "One of the cantons in the framed Swiss play area.",
  },
  admin_division_4: {
    label: "Municipality",
    promptNoun: "municipality",
    ruleSummary: "A municipality within the framed Swiss play area.",
  },
};

export const SWITZERLAND_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Canton border",
    promptNoun: "a canton border",
  },
  admin4_border: {
    label: "Municipality border",
    promptNoun: "a municipality border",
  },
};
