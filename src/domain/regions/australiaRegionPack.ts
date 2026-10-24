import type { MatchingCategoryId } from "../questions/matchingQuestions";
import type { MeasuringFromKind } from "../questions/measuringQuestions";
import type { RegionPackId, RegionPackLabelOverride } from "./regionPack";

export const AUSTRALIA_REGION_PACK_ID = "australia" satisfies RegionPackId;

export const AUSTRALIA_STATES = ["nsw", "vic", "qld", "sa", "wa", "tas", "nt", "act"] as const;

export type AustraliaStateId = (typeof AUSTRALIA_STATES)[number];

export const AUSTRALIA_GEO_ASSETS = {
  states: "/geo/australia/states.geojson",
  statesByState: (stateId: string) => `/geo/australia/states/${stateId}.geojson`,
  lgas: "/geo/australia/lgas.geojson",
  lgasByState: (stateId: string) => `/geo/australia/lgas/${stateId}.geojson`,
  ced: "/geo/australia/ced.geojson",
  cedByState: (stateId: string) => `/geo/australia/ced/${stateId}.geojson`,
  sed: "/geo/australia/sed.geojson",
  sedByState: (stateId: string) => `/geo/australia/sed/${stateId}.geojson`,
} as const;

export const AUSTRALIA_MATCHING_LABEL_OVERRIDES: Partial<
  Record<MatchingCategoryId, RegionPackLabelOverride>
> = {
  admin_division_1: {
    label: "CED",
    promptNoun: "CED",
    ruleSummary: "A Commonwealth Electoral Division (CED) within the framed Australian play area.",
  },
  admin_division_2: {
    label: "SED",
    promptNoun: "SED",
    ruleSummary: "A State Electoral Division (SED) within the framed Australian play area.",
  },
  admin_division_3: {
    label: "State/Territory",
    promptNoun: "state or territory",
    ruleSummary: "One of the Australian states or territories in the framed play area.",
  },
  admin_division_4: {
    label: "LGA",
    promptNoun: "LGA",
    ruleSummary: "A Local Government Area (LGA) within the framed Australian play area.",
  },
};

export const AUSTRALIA_MEASURING_LABEL_OVERRIDES: Partial<
  Record<MeasuringFromKind, RegionPackLabelOverride>
> = {
  admin1_border: {
    label: "CED border",
    promptNoun: "a CED border",
  },
  admin2_border: {
    label: "SED border",
    promptNoun: "a SED border",
  },
  admin3_border: {
    label: "State/Territory border",
    promptNoun: "a state or territory border",
  },
  admin4_border: {
    label: "LGA border",
    promptNoun: "an LGA border",
  },
};
