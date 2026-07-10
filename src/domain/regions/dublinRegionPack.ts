import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { DublinCouncilFilter, RegionPackId } from "./regionPack";

export const DUBLIN_REGION_PACK_ID = "dublin" satisfies RegionPackId;

export const DUBLIN_GEO_ASSETS = {
  councils: "/geo/dublin/councils.geojson",
  leas: "/geo/dublin/leas.geojson",
  leasByCouncil: (councilId: DublinCouncilFilter) =>
    `/geo/dublin/leas/${councilId}.geojson`,
} as const;

export interface RegionPackLabelOverride {
  label: string;
  promptNoun: string;
  ruleSummary?: string;
}

export const DUBLIN_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Local Authority",
    promptNoun: "local authority",
    ruleSummary:
      "One of the four Dublin local authorities (city or county council).",
  },
  admin_division_4: {
    label: "Local Electoral Area",
    promptNoun: "local electoral area",
    ruleSummary:
      "A local electoral area (LEA) within the framed Dublin play area.",
  },
};

export const DUBLIN_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Local authority border",
    promptNoun: "a local authority border",
  },
  admin4_border: {
    label: "Local electoral area border",
    promptNoun: "a local electoral area border",
  },
};

export function isDublinRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackId === DUBLIN_REGION_PACK_ID;
}
