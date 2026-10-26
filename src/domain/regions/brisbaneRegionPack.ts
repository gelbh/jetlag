import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const BRISBANE_REGION_PACK_ID = "brisbane" satisfies RegionPackId;

export const BRISBANE_GEO_ASSETS = {
  wards: "/geo/brisbane/wards.geojson",
  city: "/geo/brisbane/city.geojson",
} as const;

export const BRISBANE_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Ward",
    promptNoun: "ward",
    ruleSummary: "One of the 26 wards in the framed City of Brisbane play area.",
  },
};

export const BRISBANE_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Ward border",
    promptNoun: "a ward border",
  },
};
