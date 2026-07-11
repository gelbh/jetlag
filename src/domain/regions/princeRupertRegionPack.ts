import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId } from "./regionPack";
import type { RegionPackLabelOverride } from "./dublinRegionPack";

export const PRINCE_RUPERT_REGION_PACK_ID =
  "prince-rupert" satisfies RegionPackId;

export const PRINCE_RUPERT_GEO_ASSETS = {
  city: "/geo/prince-rupert/city.geojson",
  neighbourhoods: "/geo/prince-rupert/neighbourhoods.geojson",
  areas: "/geo/prince-rupert/areas.geojson",
  poi: (category: string) => `/geo/prince-rupert/poi/${category}.json`,
} as const;

export const PRINCE_RUPERT_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_3: {
    label: "Neighbourhood",
    promptNoun: "neighbourhood",
    ruleSummary:
      "A recognized neighbourhood within the framed Prince Rupert play area.",
  },
  admin_division_4: {
    label: "Area",
    promptNoun: "area",
    ruleSummary: "One of the city area quadrants within Prince Rupert.",
  },
};

export const PRINCE_RUPERT_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin3_border: {
    label: "Neighbourhood border",
    promptNoun: "a neighbourhood border",
  },
  admin4_border: {
    label: "Area border",
    promptNoun: "an area border",
  },
};

export function isPrinceRupertRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackId === PRINCE_RUPERT_REGION_PACK_ID;
}
