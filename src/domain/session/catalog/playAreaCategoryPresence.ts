import { MATCHING_CATEGORIES } from "../../questions/matching/matchingCatalog";
import {
  BASE_MEASURING_CATALOG,
  CUSTOM_PACK_GATED_MEASURING,
} from "../../questions/measuring/measuringCatalog";
import type { RegionPackId } from "../../regions/regionPack";
import { packCategoryDenylist } from "./playAreaCategoryDenylist";

export type PlayAreaCategoryPresenceProbeSpec = {
  id: string;
  selectors: string[];
};

export type CategoryPresenceReason = "denylist" | "admin" | "reactive" | "probe";

export type ResolveCategoryPresenceInput = {
  categoryId: string;
  regionPackId: RegionPackId;
  adminUnavailable?: boolean;
  probeCount?: number;
  reactiveUnavailable?: boolean;
  probePending?: boolean;
};

export type CategoryPresenceResult = {
  available: boolean;
  reason?: CategoryPresenceReason;
};

const ADMIN_COVERED_CATEGORY_IDS: ReadonlySet<string> = new Set([
  "admin1_border",
  "admin2_border",
  "admin3_border",
  "admin4_border",
  "admin_division_1",
  "admin_division_2",
  "admin_division_3",
  "admin_division_4",
]);

const SKIP_PROBE_CATEGORY_IDS: ReadonlySet<string> = new Set([
  "coastline",
  "sea_level",
  ...ADMIN_COVERED_CATEGORY_IDS,
]);

/**
 * Merge denylist, admin, reactive, and Overpass probe signals.
 * Priority: denylist → admin → reactive → probe total === 0 → available.
 * While probe is pending or count is unset, never grey from probe (avoid flash).
 * Pack POI `source:"none"` stubs are never consulted.
 */
export function resolveCategoryPresence(
  input: ResolveCategoryPresenceInput,
): CategoryPresenceResult {
  const {
    categoryId,
    regionPackId,
    adminUnavailable = false,
    probeCount,
    reactiveUnavailable = false,
    probePending = false,
  } = input;

  if (packCategoryDenylist(regionPackId).has(categoryId)) {
    return { available: false, reason: "denylist" };
  }

  if (adminUnavailable) {
    return { available: false, reason: "admin" };
  }

  if (reactiveUnavailable) {
    return { available: false, reason: "reactive" };
  }

  if (!probePending && probeCount !== undefined && probeCount === 0) {
    return { available: false, reason: "probe" };
  }

  return { available: true };
}

function unionSelectors(
  existing: readonly string[] | undefined,
  next: readonly string[],
): string[] {
  if (!existing || existing.length === 0) {
    return [...next];
  }
  const seen = new Set(existing);
  const merged = [...existing];
  for (const selector of next) {
    if (!seen.has(selector)) {
      seen.add(selector);
      merged.push(selector);
    }
  }
  return merged;
}

/**
 * OSM-backed Measuring/Matching catalog ids with selectors (probe breadth 4B).
 * Skips coastline/sea_level and admin kinds covered by the admin division probe.
 */
export function playAreaCategoryPresenceProbeSpecs(): PlayAreaCategoryPresenceProbeSpec[] {
  const byId = new Map<string, string[]>();

  for (const option of [...BASE_MEASURING_CATALOG, ...CUSTOM_PACK_GATED_MEASURING]) {
    if (SKIP_PROBE_CATEGORY_IDS.has(option.id)) {
      continue;
    }
    const selectors = [...option.overpassSelectors, ...option.linearSelectors];
    if (selectors.length === 0) {
      continue;
    }
    byId.set(option.id, unionSelectors(byId.get(option.id), selectors));
  }

  for (const category of MATCHING_CATEGORIES) {
    if (SKIP_PROBE_CATEGORY_IDS.has(category.id)) {
      continue;
    }
    const selectors =
      "overpassSelectors" in category && category.overpassSelectors
        ? [...category.overpassSelectors]
        : [];
    if (selectors.length === 0) {
      continue;
    }
    byId.set(category.id, unionSelectors(byId.get(category.id), selectors));
  }

  return [...byId.entries()].map(([id, selectors]) => ({ id, selectors }));
}
