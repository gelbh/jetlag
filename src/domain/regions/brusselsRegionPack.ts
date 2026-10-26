import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const BRUSSELS_REGION_PACK_ID = "brussels" satisfies RegionPackId;

export const BRUSSELS_GEO_ASSETS = {
  communes: "/geo/brussels/communes.geojson",
  city: "/geo/brussels/city.geojson",
} as const;

export const BRUSSELS_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Commune",
    promptNoun: "commune",
    ruleSummary: "One of the 19 communes in the framed Brussels-Capital Region play area.",
  },
};

export const BRUSSELS_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Commune border",
    promptNoun: "a commune border",
  },
};
