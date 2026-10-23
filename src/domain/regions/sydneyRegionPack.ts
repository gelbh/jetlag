import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const SYDNEY_REGION_PACK_ID = "sydney" satisfies RegionPackId;

export const SYDNEY_GEO_ASSETS = {
  lgas: "/geo/sydney/lgas.geojson",
  playArea: "/geo/sydney/playArea.geojson",
} as const;

export const SYDNEY_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Local Government Area",
    promptNoun: "local government area",
    ruleSummary: "One of the LGAs in the framed Greater Sydney play area.",
  },
};

export const SYDNEY_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "LGA border",
    promptNoun: "an LGA border",
  },
};

export function isSydneyRegionPack(regionPackId: RegionPackId | undefined): boolean {
  return regionPackId === SYDNEY_REGION_PACK_ID;
}
