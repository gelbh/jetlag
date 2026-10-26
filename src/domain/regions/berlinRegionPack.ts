import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const BERLIN_REGION_PACK_ID = "berlin" satisfies RegionPackId;

export const BERLIN_GEO_ASSETS = {
  bezirke: "/geo/berlin/bezirke.geojson",
  city: "/geo/berlin/city.geojson",
} as const;

export const BERLIN_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Bezirk",
    promptNoun: "Bezirk",
    ruleSummary: "One of the 12 Bezirke in the framed Land Berlin play area.",
  },
};

export const BERLIN_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Bezirk border",
    promptNoun: "a Bezirk border",
  },
};
