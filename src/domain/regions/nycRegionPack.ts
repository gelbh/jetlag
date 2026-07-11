import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId } from "./regionPack";

export const NYC_REGION_PACK_ID = "nyc" satisfies RegionPackId;

export const NYC_GEO_ASSETS = {
  boroughs: "/geo/nyc/boroughs.geojson",
  districts: "/geo/nyc/districts.geojson",
  districtsByBorough: (boroughId: string) =>
    `/geo/nyc/districts/${boroughId}.geojson`,
  poi: (category: string) => `/geo/nyc/poi/${category}.json`,
} as const;

export interface RegionPackLabelOverride {
  label: string;
  promptNoun: string;
  ruleSummary?: string;
}

export const NYC_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Borough",
    promptNoun: "borough",
    ruleSummary: "One of the five New York City boroughs.",
  },
  admin_division_4: {
    label: "Community district",
    promptNoun: "community district",
    ruleSummary:
      "A community district within the framed New York City play area.",
  },
};

export const NYC_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Borough border",
    promptNoun: "a borough border",
  },
  admin4_border: {
    label: "Community district border",
    promptNoun: "a community district border",
  },
};

export function isNycRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackId === NYC_REGION_PACK_ID;
}
