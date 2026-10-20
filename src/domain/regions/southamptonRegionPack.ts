import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const SOUTHAMPTON_REGION_PACK_ID = "southampton" satisfies RegionPackId;

export const SOUTHAMPTON_GEO_ASSETS = {
  wards: "/geo/southampton/wards.geojson",
  city: "/geo/southampton/city.geojson",
} as const;

export const SOUTHAMPTON_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Ward",
    promptNoun: "ward",
    ruleSummary: "One of the electoral wards in the framed Southampton play area.",
  },
};

export const SOUTHAMPTON_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Ward border",
    promptNoun: "a ward border",
  },
};
