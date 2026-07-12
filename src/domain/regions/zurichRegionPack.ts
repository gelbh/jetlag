import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId } from "./regionPack";
import type { RegionPackLabelOverride } from "./regionPack";

export const ZURICH_REGION_PACK_ID = "zurich" satisfies RegionPackId;

export const ZURICH_GEO_ASSETS = {
  districts: "/geo/zurich/districts.geojson",
  quarters: "/geo/zurich/quarters.geojson",
  quartersByDistrict: (districtId: string) =>
    `/geo/zurich/quarters/${districtId}.geojson`,
} as const;

export const ZURICH_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "District",
    promptNoun: "district",
    ruleSummary: "One of the districts in the framed Zürich play area.",
  },
  admin_division_4: {
    label: "City quarter",
    promptNoun: "city quarter",
    ruleSummary:
      "A city quarter within the framed Zürich play area.",
  },
};

export const ZURICH_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "District border",
    promptNoun: "a district border",
  },
  admin4_border: {
    label: "City quarter border",
    promptNoun: "a city quarter border",
  },
};

export function isZurichRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackId === ZURICH_REGION_PACK_ID;
}
