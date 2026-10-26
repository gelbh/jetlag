import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const SINGAPORE_REGION_PACK_ID = "singapore" satisfies RegionPackId;

export const SINGAPORE_GEO_ASSETS = {
  planningAreas: "/geo/singapore/planning-areas.geojson",
  city: "/geo/singapore/city.geojson",
} as const;

export const SINGAPORE_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Planning area",
    promptNoun: "planning area",
    ruleSummary: "One of the 55 URA planning areas in the Singapore play area.",
  },
};

export const SINGAPORE_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Planning area border",
    promptNoun: "a planning area border",
  },
};
