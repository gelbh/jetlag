import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const AMSTERDAM_REGION_PACK_ID = "amsterdam" satisfies RegionPackId;

export const AMSTERDAM_GEO_ASSETS = {
  stadsdelen: "/geo/amsterdam/stadsdelen.geojson",
  city: "/geo/amsterdam/city.geojson",
} as const;

export const AMSTERDAM_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Stadsdeel",
    promptNoun: "stadsdeel",
    ruleSummary: "One of the 9 official stadsdelen in the framed Gemeente Amsterdam play area.",
  },
};

export const AMSTERDAM_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Stadsdeel border",
    promptNoun: "a stadsdeel border",
  },
};
