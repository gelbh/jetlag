import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId } from "./regionPack";
import type { RegionPackLabelOverride } from "./regionPack";

export const PORTLAND_MAINE_REGION_PACK_ID =
  "portland-maine" satisfies RegionPackId;

export const PORTLAND_MAINE_GEO_ASSETS = {
  municipalities: "/geo/portland-maine/municipalities.geojson",
  districts: "/geo/portland-maine/districts.geojson",
  neighborhoods: "/geo/portland-maine/neighborhoods.geojson",
  neighborhoodsByDistrict: (districtId: string) =>
    `/geo/portland-maine/neighborhoods/${districtId}.geojson`,
  poi: (category: string) => `/geo/portland-maine/poi/${category}.json`,
} as const;

export const PORTLAND_MAINE_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Council district",
    promptNoun: "council district",
    ruleSummary: "One of the five Portland council districts.",
  },
  admin_division_4: {
    label: "Neighborhood",
    promptNoun: "neighborhood",
    ruleSummary:
      "A recognized neighborhood within the framed Portland play area.",
  },
};

export const PORTLAND_MAINE_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Council district border",
    promptNoun: "a council district border",
  },
  admin4_border: {
    label: "Neighborhood border",
    promptNoun: "a neighborhood border",
  },
};

export function isPortlandMaineRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackId === PORTLAND_MAINE_REGION_PACK_ID;
}
