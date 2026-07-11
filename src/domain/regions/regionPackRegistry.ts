import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import {
  DUBLIN_GEO_ASSETS,
  DUBLIN_MATCHING_LABEL_OVERRIDES,
  DUBLIN_MEASURING_LABEL_OVERRIDES,
  DUBLIN_REGION_PACK_ID,
} from "./dublinRegionPack";
import {
  LONDON_GEO_ASSETS,
  LONDON_MATCHING_LABEL_OVERRIDES,
  LONDON_MEASURING_LABEL_OVERRIDES,
  LONDON_REGION_PACK_ID,
} from "./londonRegionPack";
import {
  LUCERNE_GEO_ASSETS,
  LUCERNE_MATCHING_LABEL_OVERRIDES,
  LUCERNE_MEASURING_LABEL_OVERRIDES,
  LUCERNE_REGION_PACK_ID,
} from "./lucerneRegionPack";
import {
  NYC_GEO_ASSETS,
  NYC_MATCHING_LABEL_OVERRIDES,
  NYC_MEASURING_LABEL_OVERRIDES,
  NYC_REGION_PACK_ID,
} from "./nycRegionPack";
import {
  OSAKA_GEO_ASSETS,
  OSAKA_MATCHING_LABEL_OVERRIDES,
  OSAKA_MEASURING_LABEL_OVERRIDES,
  OSAKA_REGION_PACK_ID,
} from "./osakaRegionPack";
import type { RegionPackLabelOverride } from "./dublinRegionPack";
import type { RegionPackId } from "./regionPack";
import {
  TOKYO_GEO_ASSETS,
  TOKYO_MATCHING_LABEL_OVERRIDES,
  TOKYO_MEASURING_LABEL_OVERRIDES,
  TOKYO_REGION_PACK_ID,
} from "./tokyoRegionPack";
import {
  PORTLAND_MAINE_GEO_ASSETS,
  PORTLAND_MAINE_MATCHING_LABEL_OVERRIDES,
  PORTLAND_MAINE_MEASURING_LABEL_OVERRIDES,
  PORTLAND_MAINE_REGION_PACK_ID,
} from "./portlandMaineRegionPack";
import {
  ZURICH_GEO_ASSETS,
  ZURICH_MATCHING_LABEL_OVERRIDES,
  ZURICH_MEASURING_LABEL_OVERRIDES,
  ZURICH_REGION_PACK_ID,
} from "./zurichRegionPack";

export interface RegionPackGeoAssets {
  primary: string;
  secondary: string;
  secondaryBySubregion?: (subregionId: string) => string;
  playArea?: string;
}

export interface RegionPackConfig {
  id: RegionPackId;
  geoAssets: RegionPackGeoAssets;
  subregionPropertyKey: string;
  /** When "secondary", full-pack play area unions level-9 features instead of level-8. */
  playAreaLevel?: "primary" | "secondary";
  matchingLabelOverrides: Partial<
    Record<MatchingCategoryId, RegionPackLabelOverride>
  >;
  measuringLabelOverrides: Partial<
    Record<MeasuringFromKind, RegionPackLabelOverride>
  >;
  unsupportedMatching: ReadonlySet<
    "admin_division_1" | "admin_division_2" | "admin_division_3" | "admin_division_4"
  >;
  unsupportedBorders: ReadonlySet<MeasuringFromKind>;
}

const HIDE_COUNTRY_PROVINCE_MATCHING = new Set<
  "admin_division_1" | "admin_division_2"
>(["admin_division_1", "admin_division_2"]);

const HIDE_COUNTRY_PROVINCE_BORDERS = new Set<MeasuringFromKind>([
  "admin1_border",
  "admin2_border",
]);

export const REGION_PACK_CONFIGS: Record<RegionPackId, RegionPackConfig> = {
  [DUBLIN_REGION_PACK_ID]: {
    id: DUBLIN_REGION_PACK_ID,
    geoAssets: {
      primary: DUBLIN_GEO_ASSETS.councils,
      secondary: DUBLIN_GEO_ASSETS.leas,
      secondaryBySubregion: (subregionId) =>
        DUBLIN_GEO_ASSETS.leasByCouncil(
          subregionId as "dcc" | "fingal" | "sdcc" | "dlr",
        ),
    },
    subregionPropertyKey: "councilId",
    matchingLabelOverrides: DUBLIN_MATCHING_LABEL_OVERRIDES,
    measuringLabelOverrides: DUBLIN_MEASURING_LABEL_OVERRIDES,
    unsupportedMatching: HIDE_COUNTRY_PROVINCE_MATCHING,
    unsupportedBorders: HIDE_COUNTRY_PROVINCE_BORDERS,
  },
  [NYC_REGION_PACK_ID]: {
    id: NYC_REGION_PACK_ID,
    geoAssets: {
      primary: NYC_GEO_ASSETS.boroughs,
      secondary: NYC_GEO_ASSETS.districts,
      secondaryBySubregion: (subregionId) =>
        NYC_GEO_ASSETS.districtsByBorough(subregionId),
    },
    subregionPropertyKey: "boroughId",
    matchingLabelOverrides: NYC_MATCHING_LABEL_OVERRIDES,
    measuringLabelOverrides: NYC_MEASURING_LABEL_OVERRIDES,
    unsupportedMatching: HIDE_COUNTRY_PROVINCE_MATCHING,
    unsupportedBorders: HIDE_COUNTRY_PROVINCE_BORDERS,
  },
  [LONDON_REGION_PACK_ID]: {
    id: LONDON_REGION_PACK_ID,
    geoAssets: {
      primary: LONDON_GEO_ASSETS.boroughs,
      secondary: LONDON_GEO_ASSETS.areas,
      secondaryBySubregion: (subregionId) =>
        LONDON_GEO_ASSETS.areasByBorough(subregionId),
    },
    subregionPropertyKey: "boroughId",
    matchingLabelOverrides: LONDON_MATCHING_LABEL_OVERRIDES,
    measuringLabelOverrides: LONDON_MEASURING_LABEL_OVERRIDES,
    unsupportedMatching: HIDE_COUNTRY_PROVINCE_MATCHING,
    unsupportedBorders: HIDE_COUNTRY_PROVINCE_BORDERS,
  },
  [TOKYO_REGION_PACK_ID]: {
    id: TOKYO_REGION_PACK_ID,
    geoAssets: {
      primary: TOKYO_GEO_ASSETS.wards,
      secondary: TOKYO_GEO_ASSETS.areas,
      secondaryBySubregion: (subregionId) =>
        TOKYO_GEO_ASSETS.areasByWard(subregionId),
    },
    subregionPropertyKey: "wardId",
    matchingLabelOverrides: TOKYO_MATCHING_LABEL_OVERRIDES,
    measuringLabelOverrides: TOKYO_MEASURING_LABEL_OVERRIDES,
    unsupportedMatching: HIDE_COUNTRY_PROVINCE_MATCHING,
    unsupportedBorders: HIDE_COUNTRY_PROVINCE_BORDERS,
  },
  [OSAKA_REGION_PACK_ID]: {
    id: OSAKA_REGION_PACK_ID,
    geoAssets: {
      primary: OSAKA_GEO_ASSETS.wards,
      secondary: OSAKA_GEO_ASSETS.areas,
      secondaryBySubregion: (subregionId) =>
        OSAKA_GEO_ASSETS.areasByWard(subregionId),
    },
    subregionPropertyKey: "wardId",
    matchingLabelOverrides: OSAKA_MATCHING_LABEL_OVERRIDES,
    measuringLabelOverrides: OSAKA_MEASURING_LABEL_OVERRIDES,
    unsupportedMatching: HIDE_COUNTRY_PROVINCE_MATCHING,
    unsupportedBorders: HIDE_COUNTRY_PROVINCE_BORDERS,
  },
  [ZURICH_REGION_PACK_ID]: {
    id: ZURICH_REGION_PACK_ID,
    geoAssets: {
      primary: ZURICH_GEO_ASSETS.districts,
      secondary: ZURICH_GEO_ASSETS.quarters,
      secondaryBySubregion: (subregionId) =>
        ZURICH_GEO_ASSETS.quartersByDistrict(subregionId),
    },
    subregionPropertyKey: "districtId",
    matchingLabelOverrides: ZURICH_MATCHING_LABEL_OVERRIDES,
    measuringLabelOverrides: ZURICH_MEASURING_LABEL_OVERRIDES,
    unsupportedMatching: HIDE_COUNTRY_PROVINCE_MATCHING,
    unsupportedBorders: HIDE_COUNTRY_PROVINCE_BORDERS,
  },
  [LUCERNE_REGION_PACK_ID]: {
    id: LUCERNE_REGION_PACK_ID,
    geoAssets: {
      primary: LUCERNE_GEO_ASSETS.districts,
      secondary: LUCERNE_GEO_ASSETS.municipalities,
      secondaryBySubregion: (subregionId) =>
        LUCERNE_GEO_ASSETS.municipalitiesByDistrict(subregionId),
    },
    subregionPropertyKey: "districtId",
    playAreaLevel: "secondary",
    matchingLabelOverrides: LUCERNE_MATCHING_LABEL_OVERRIDES,
    measuringLabelOverrides: LUCERNE_MEASURING_LABEL_OVERRIDES,
    unsupportedMatching: HIDE_COUNTRY_PROVINCE_MATCHING,
    unsupportedBorders: HIDE_COUNTRY_PROVINCE_BORDERS,
  },
  [PORTLAND_MAINE_REGION_PACK_ID]: {
    id: PORTLAND_MAINE_REGION_PACK_ID,
    geoAssets: {
      primary: PORTLAND_MAINE_GEO_ASSETS.districts,
      secondary: PORTLAND_MAINE_GEO_ASSETS.neighborhoods,
      secondaryBySubregion: (subregionId) =>
        PORTLAND_MAINE_GEO_ASSETS.neighborhoodsByDistrict(subregionId),
      playArea: PORTLAND_MAINE_GEO_ASSETS.municipalities,
    },
    subregionPropertyKey: "districtId",
    matchingLabelOverrides: PORTLAND_MAINE_MATCHING_LABEL_OVERRIDES,
    measuringLabelOverrides: PORTLAND_MAINE_MEASURING_LABEL_OVERRIDES,
    unsupportedMatching: HIDE_COUNTRY_PROVINCE_MATCHING,
    unsupportedBorders: HIDE_COUNTRY_PROVINCE_BORDERS,
  },
};

export function getRegionPackConfig(
  packId: RegionPackId,
): RegionPackConfig | undefined {
  return REGION_PACK_CONFIGS[packId];
}

export function isKnownRegionPack(
  regionPackId: RegionPackId | undefined,
): regionPackId is RegionPackId {
  return regionPackId !== undefined && regionPackId in REGION_PACK_CONFIGS;
}
