import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId } from "./regionPack";
import type { RegionPackLabelOverride } from "./dublinRegionPack";

export const LUCERNE_REGION_PACK_ID = "lucerne" satisfies RegionPackId;

export const LUCERNE_GEO_ASSETS = {
  districts: "/geo/lucerne/districts.geojson",
  municipalities: "/geo/lucerne/municipalities.geojson",
  municipalitiesByDistrict: (districtId: string) =>
    `/geo/lucerne/municipalities/${districtId}.geojson`,
} as const;

export const LUCERNE_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "District",
    promptNoun: "district",
    ruleSummary: "One of the districts in the framed Lucerne play area.",
  },
  admin_division_4: {
    label: "Municipality",
    promptNoun: "municipality",
    ruleSummary:
      "A municipality within the framed Lucerne play area.",
  },
};

export const LUCERNE_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "District border",
    promptNoun: "a district border",
  },
  admin4_border: {
    label: "Municipality border",
    promptNoun: "a municipality border",
  },
};

export function isLucerneRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackId === LUCERNE_REGION_PACK_ID;
}
