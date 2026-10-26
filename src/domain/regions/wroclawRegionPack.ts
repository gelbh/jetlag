import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const WROCLAW_REGION_PACK_ID = "wroclaw" satisfies RegionPackId;

export const WROCLAW_GEO_ASSETS = {
  dzielnice: "/geo/wroclaw/dzielnice.geojson",
  city: "/geo/wroclaw/city.geojson",
} as const;

export const WROCLAW_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Dzielnica",
    promptNoun: "dzielnica",
    ruleSummary:
      "One of the 48 official dzielnice in the framed Miasto Wrocław play area (uchwała XX/419/16).",
  },
};

export const WROCLAW_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Dzielnica border",
    promptNoun: "a dzielnica border",
  },
};
