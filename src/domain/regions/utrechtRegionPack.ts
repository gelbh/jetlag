import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const UTRECHT_REGION_PACK_ID = "utrecht" satisfies RegionPackId;

export const UTRECHT_GEO_ASSETS = {
  wijken: "/geo/utrecht/wijken.geojson",
  city: "/geo/utrecht/city.geojson",
} as const;

export const UTRECHT_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Wijk",
    promptNoun: "wijk",
    ruleSummary: "One of the 10 official wijken in the framed Gemeente Utrecht play area.",
  },
};

export const UTRECHT_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Wijk border",
    promptNoun: "a wijk border",
  },
};
