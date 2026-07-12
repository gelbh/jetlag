import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId } from "./regionPack";
import type { RegionPackLabelOverride } from "./regionPack";

export const TOKYO_REGION_PACK_ID = "tokyo" satisfies RegionPackId;

export const TOKYO_GEO_ASSETS = {
  wards: "/geo/tokyo/wards.geojson",
  areas: "/geo/tokyo/areas.geojson",
  areasByWard: (wardId: string) => `/geo/tokyo/areas/${wardId}.geojson`,
} as const;

export const TOKYO_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Special ward",
    promptNoun: "special ward",
    ruleSummary: "One of the Tokyo special wards in the framed play area.",
  },
  admin_division_4: {
    label: "Local area",
    promptNoun: "local area",
    ruleSummary: "A local area subdivision within the framed Tokyo play area.",
  },
};

export const TOKYO_MEASURING_LABEL_OVERRIDES: Partial<
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

export function isTokyoRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackId === TOKYO_REGION_PACK_ID;
}
