import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId } from "./regionPack";
import type { RegionPackLabelOverride } from "./regionPack";

export const LONDON_REGION_PACK_ID = "london" satisfies RegionPackId;

export const LONDON_GEO_ASSETS = {
  boroughs: "/geo/london/boroughs.geojson",
  areas: "/geo/london/areas.geojson",
  areasByBorough: (boroughId: string) =>
    `/geo/london/areas/${boroughId}.geojson`,
} as const;

export const LONDON_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Borough",
    promptNoun: "borough",
    ruleSummary: "One of the London boroughs in the framed play area.",
  },
  admin_division_4: {
    label: "Local area",
    promptNoun: "local area",
    ruleSummary: "A local area subdivision within the framed London play area.",
  },
};

export const LONDON_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Borough border",
    promptNoun: "a borough border",
  },
  admin4_border: {
    label: "Local area border",
    promptNoun: "a local area border",
  },
};

export function isLondonRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackId === LONDON_REGION_PACK_ID;
}
