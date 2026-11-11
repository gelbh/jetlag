import type { GameArea } from "@/domain/map/annotations";
import type { MatchingCategoryId, MeasuringFromKind } from "@/domain/questions";
import type { RegionPackId } from "@/domain/regions/regionPack";
import { getRegionPackConfig } from "@/domain/regions/regionPackRegistry";
import type {
  CustomMatchingAreasByLevel,
  MatchingAdminLevel,
} from "@/domain/session/catalog/sessionCustomContent";
import { regionPackHasBundledBoundaries } from "../matching/regionPackBoundaries";
import { fetchAdminDivisionFeaturesInArea } from "./adminDivisionBoundaries";
import type { OverpassLoad } from "./overpassLoad";

export const MIN_ADMIN_DIVISIONS_FOR_AVAILABILITY = 2;

export const ADMIN_DIVISION_PROBE_LEVELS = [4, 6, 8, 9] as const;

export function isBundledAdminRegionPack(regionPackId: RegionPackId | undefined): boolean {
  return regionPackHasBundledBoundaries(regionPackId);
}

/**
 * Single Overpass-admin-border-fallthrough gate. Bundled region packs
 * (Dublin, NYC, ...) never have Overpass-sized admin boundaries for the
 * levels they hide — Overpass-falling-through for an admin border with no
 * bundled custom data is what OOM'd the proxy (incident 9f05e1c1).
 */
export function allowsOverpassAdminBorderFallthrough(
  regionPackId: RegionPackId | undefined,
): boolean {
  return !isBundledAdminRegionPack(regionPackId);
}

export type AdminDivisionMatchingCategory =
  | "admin_division_1"
  | "admin_division_2"
  | "admin_division_3"
  | "admin_division_4";

export type AdminDivisionLevelStatus = { status: "ok"; count: number } | { status: "error" };

export type AdminDivisionCounts = Record<
  AdminDivisionMatchingCategory,
  AdminDivisionLevelStatus | null
>;

const ADMIN_DIVISION_CATEGORIES: readonly AdminDivisionMatchingCategory[] = [
  "admin_division_1",
  "admin_division_2",
  "admin_division_3",
  "admin_division_4",
];

export function emptyAdminDivisionCounts(): AdminDivisionCounts {
  return {
    admin_division_1: null,
    admin_division_2: null,
    admin_division_3: null,
    admin_division_4: null,
  };
}

export function okAdminDivisionCounts(
  partial: Partial<Record<AdminDivisionMatchingCategory, number>>,
): AdminDivisionCounts {
  const counts = emptyAdminDivisionCounts();
  for (const category of ADMIN_DIVISION_CATEGORIES) {
    const count = partial[category];
    if (count !== undefined) {
      counts[category] = { status: "ok", count };
    }
  }
  return counts;
}

export function allAdminDivisionLevelsError(): AdminDivisionCounts {
  return {
    admin_division_1: { status: "error" },
    admin_division_2: { status: "error" },
    admin_division_3: { status: "error" },
    admin_division_4: { status: "error" },
  };
}

export function adminDivisionOkCount(
  categoryId: AdminDivisionMatchingCategory,
  counts: AdminDivisionCounts | null | undefined,
): number | null {
  const entry = counts?.[categoryId];
  if (!entry || entry.status !== "ok") {
    return null;
  }
  return entry.count;
}

export function adminCategoryForProbeLevel(level: number): AdminDivisionMatchingCategory | null {
  switch (level) {
    case 4:
      return "admin_division_1";
    case 6:
      return "admin_division_2";
    case 8:
      return "admin_division_3";
    case 9:
      return "admin_division_4";
    default:
      return null;
  }
}

export function isAdminDivisionMatchingCategory(
  categoryId: MatchingCategoryId,
): categoryId is AdminDivisionMatchingCategory {
  return ADMIN_DIVISION_CATEGORIES.includes(categoryId as AdminDivisionMatchingCategory);
}

export async function probeAdminDivisionCounts(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  load?: Pick<OverpassLoad, "priority" | "signal">,
): Promise<AdminDivisionCounts> {
  const counts = emptyAdminDivisionCounts();

  await Promise.all(
    ADMIN_DIVISION_PROBE_LEVELS.map(async (level) => {
      const category = adminCategoryForProbeLevel(level);
      if (!category) {
        return;
      }

      if (!isRegionPackMatchingCategorySupported(category, regionPackId)) {
        return;
      }

      try {
        const features = await fetchAdminDivisionFeaturesInArea(
          gameArea,
          level,
          customMatchingAreas?.[level],
          load,
        );

        counts[category] = { status: "ok", count: features.length };
      } catch {
        counts[category] = { status: "error" };
      }
    }),
  );

  return counts;
}

function bundledAdminLevelsForSession(
  customMatchingAreas: CustomMatchingAreasByLevel | undefined,
): readonly number[] {
  return ADMIN_DIVISION_PROBE_LEVELS.filter((level) =>
    Boolean(customMatchingAreas?.[level as MatchingAdminLevel]),
  );
}

/**
 * Admin levels safe to touch for this session: the single source of truth
 * for both UI availability (real `adminDivisionCounts`) and speculative
 * background preload (omit `adminDivisionCounts` entirely).
 *
 * - Bundled region packs (Dublin, NYC, ...) are always restricted to the
 *   levels backed by bundled `customMatchingAreas` — they never have
 *   Overpass-sized boundaries for the levels they hide, and preloading or
 *   Overpass-falling-through for those levels anyway is what OOM'd the proxy
 *   (incident 9f05e1c1).
 * - Non-bundled sessions with real counts (`adminDivisionCounts` passed as
 *   `AdminDivisionCounts | null`) filter to levels with enough divisions,
 *   hiding categories while the probe is still pending.
 * - Non-bundled sessions with `adminDivisionCounts` omitted (preload has no
 *   counts yet and doesn't need any — it's warming caches speculatively)
 *   return every standard level.
 */
export function adminBoundaryLevelsForSession(
  regionPackId: RegionPackId | undefined,
  customMatchingAreas: CustomMatchingAreasByLevel | undefined,
  adminDivisionCounts?: AdminDivisionCounts | null,
): readonly number[] {
  if (isBundledAdminRegionPack(regionPackId)) {
    return bundledAdminLevelsForSession(customMatchingAreas);
  }

  if (adminDivisionCounts === undefined) {
    return ADMIN_DIVISION_PROBE_LEVELS;
  }

  return ADMIN_DIVISION_PROBE_LEVELS.filter((level) => {
    const category = adminCategoryForProbeLevel(level);
    if (!category) {
      return false;
    }

    return isAdminDivisionCategoryAvailable(category, adminDivisionCounts, regionPackId);
  });
}

export function isAdminDivisionCountAvailable(count: number): boolean {
  return count >= MIN_ADMIN_DIVISIONS_FOR_AVAILABILITY;
}

function isRegionPackMatchingCategorySupported(
  categoryId: AdminDivisionMatchingCategory,
  regionPackId: RegionPackId | undefined,
): boolean {
  if (!regionPackId) {
    return true;
  }

  const blocked = getRegionPackConfig(regionPackId)?.unsupportedMatching;
  return !blocked?.has(categoryId);
}

export function isMeasuringBorderKindSupportedForRegionPack(
  kind: MeasuringFromKind,
  regionPackId: RegionPackId | undefined,
): boolean {
  if (!regionPackId) {
    return true;
  }

  const blocked = getRegionPackConfig(regionPackId)?.unsupportedBorders;
  return !blocked?.has(kind);
}

function adminMatchingCategoryForBorderKind(
  kind: "admin1_border" | "admin2_border" | "admin3_border" | "admin4_border",
): AdminDivisionMatchingCategory {
  switch (kind) {
    case "admin1_border":
      return "admin_division_1";
    case "admin2_border":
      return "admin_division_2";
    case "admin3_border":
      return "admin_division_3";
    case "admin4_border":
      return "admin_division_4";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function isAdminDivisionCategoryListed(
  categoryId: MatchingCategoryId,
  counts: AdminDivisionCounts | null | undefined,
  regionPackId?: RegionPackId,
): boolean {
  if (!isAdminDivisionMatchingCategory(categoryId)) {
    return true;
  }

  if (!isRegionPackMatchingCategorySupported(categoryId, regionPackId)) {
    return false;
  }

  const entry = counts?.[categoryId];
  if (entry === null || entry === undefined) {
    return false;
  }

  if (entry.status === "error") {
    return true;
  }

  return isAdminDivisionCountAvailable(entry.count);
}

export function isMeasuringAdminBorderListed(
  kind: MeasuringFromKind,
  counts: AdminDivisionCounts | null | undefined,
  regionPackId?: RegionPackId,
): boolean {
  if (!isMeasuringAdminBorderKind(kind)) {
    return true;
  }

  return isAdminDivisionCategoryListed(
    adminMatchingCategoryForBorderKind(kind),
    counts,
    regionPackId,
  );
}

export function isAdminDivisionCategoryProbeFailed(
  categoryId: MatchingCategoryId,
  counts: AdminDivisionCounts | null | undefined,
  regionPackId?: RegionPackId,
): boolean {
  if (!isAdminDivisionMatchingCategory(categoryId)) {
    return false;
  }

  if (!isRegionPackMatchingCategorySupported(categoryId, regionPackId)) {
    return false;
  }

  return counts?.[categoryId]?.status === "error";
}

export function isMeasuringAdminBorderProbeFailed(
  kind: MeasuringFromKind,
  counts: AdminDivisionCounts | null | undefined,
  regionPackId?: RegionPackId,
): boolean {
  if (!isMeasuringAdminBorderKind(kind)) {
    return false;
  }

  return isAdminDivisionCategoryProbeFailed(
    adminMatchingCategoryForBorderKind(kind),
    counts,
    regionPackId,
  );
}

export function isAdminDivisionCategoryAvailable(
  categoryId: MatchingCategoryId,
  counts: AdminDivisionCounts | null | undefined,
  regionPackId?: RegionPackId,
): boolean {
  if (!isAdminDivisionMatchingCategory(categoryId)) {
    return true;
  }

  if (!isRegionPackMatchingCategorySupported(categoryId, regionPackId)) {
    return false;
  }

  const entry = counts?.[categoryId];
  if (!entry || entry.status !== "ok") {
    return false;
  }

  return isAdminDivisionCountAvailable(entry.count);
}

export function measuringBorderKindForAdminCategory(
  categoryId: AdminDivisionMatchingCategory,
): MeasuringFromKind | null {
  switch (categoryId) {
    case "admin_division_1":
      return "admin1_border";
    case "admin_division_2":
      return "admin2_border";
    case "admin_division_3":
      return "admin3_border";
    case "admin_division_4":
      return "admin4_border";
    default:
      return null;
  }
}

export function isMeasuringAdminBorderKind(
  kind: MeasuringFromKind,
): kind is "admin1_border" | "admin2_border" | "admin3_border" | "admin4_border" {
  return (
    kind === "admin1_border" ||
    kind === "admin2_border" ||
    kind === "admin3_border" ||
    kind === "admin4_border"
  );
}

export function adminBorderKindAvailability(
  kind: MeasuringFromKind,
  counts: AdminDivisionCounts | null | undefined,
  regionPackId?: RegionPackId,
): boolean {
  if (!isMeasuringBorderKindSupportedForRegionPack(kind, regionPackId)) {
    return false;
  }
  if (!isMeasuringAdminBorderKind(kind)) {
    return true;
  }

  switch (kind) {
    case "admin1_border":
      return isAdminDivisionCategoryAvailable("admin_division_1", counts, regionPackId);
    case "admin2_border":
      return isAdminDivisionCategoryAvailable("admin_division_2", counts, regionPackId);
    case "admin3_border":
      return isAdminDivisionCategoryAvailable("admin_division_3", counts, regionPackId);
    case "admin4_border":
      return isAdminDivisionCategoryAvailable("admin_division_4", counts, regionPackId);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function adminLevelForMeasuringBorderKind(
  kind: "admin3_border" | "admin4_border" | "admin1_border" | "admin2_border",
): number {
  switch (kind) {
    case "admin1_border":
      return 4;
    case "admin2_border":
      return 6;
    case "admin3_border":
      return 8;
    case "admin4_border":
      return 9;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
