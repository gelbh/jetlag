import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId } from "./regionPack";
import type { RegionPackLabelOverride } from "./dublinRegionPack";

export const OSAKA_REGION_PACK_ID = "osaka" satisfies RegionPackId;

export const OSAKA_GEO_ASSETS = {
  wards: "/geo/osaka/wards.geojson",
  areas: "/geo/osaka/areas.geojson",
  areasByWard: (wardId: string) => `/geo/osaka/areas/${wardId}.geojson`,
} as const;

export const OSAKA_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Ward",
    promptNoun: "ward",
    ruleSummary: "One of the Osaka city wards in the framed play area.",
  },
  admin_division_4: {
    label: "Local area",
    promptNoun: "local area",
    ruleSummary: "A local area subdivision within the framed Osaka play area.",
  },
};

export const OSAKA_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Ward border",
    promptNoun: "a ward border",
  },
  admin4_border: {
    label: "Local area border",
    promptNoun: "a local area border",
  },
};

export function isOsakaRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackId === OSAKA_REGION_PACK_ID;
}
