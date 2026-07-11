import type { GameArea } from "../../domain/map/annotations";
import type { CustomMatchingAreasByLevel, MatchingAdminLevel } from "../../domain/session/sessionCustomContent";
import { adminLevelForMatchingCategory } from "../../domain/questions/matchingQuestions";
import type { MatchingCategoryId } from "../../domain/questions/matchingQuestions";
import type { MeasuringFromKind } from "../../domain/questions/measuringQuestions";
import { getRegionPackConfig } from "../../domain/regions/regionPackRegistry";
import { regionPackHasBundledBoundaries } from "./regionPackBoundaries";
import type { RegionPackId } from "../../domain/regions/regionPack";
import { fetchAdminDivisionFeaturesInArea } from "./adminDivisionBoundaries";

export const MIN_ADMIN_DIVISIONS_FOR_AVAILABILITY = 2;

export const ADMIN_DIVISION_PROBE_LEVELS = [4, 6, 8, 9] as const;

export type AdminDivisionMatchingCategory =
  | "admin_division_1"
  | "admin_division_2"
  | "admin_division_3"
  | "admin_division_4";

export type AdminDivisionCounts = Record<
  AdminDivisionMatchingCategory,
  number
>;

const ADMIN_DIVISION_CATEGORIES: readonly AdminDivisionMatchingCategory[] = [
  "admin_division_1",
  "admin_division_2",
  "admin_division_3",
  "admin_division_4",
];


export function emptyAdminDivisionCounts(): AdminDivisionCounts {
  return {
    admin_division_1: 0,
    admin_division_2: 0,
    admin_division_3: 0,
    admin_division_4: 0,
  };
}

export function adminCategoryForProbeLevel(
  level: number,
): AdminDivisionMatchingCategory | null {
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
  return ADMIN_DIVISION_CATEGORIES.includes(
    categoryId as AdminDivisionMatchingCategory,
  );
}

export async function probeAdminDivisionCounts(
  gameArea: GameArea,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
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
        );

        counts[category] = features.length;
      } catch {
        counts[category] = 0;
      }
    }),
  );

  return counts;
}

export function adminBoundaryLevelsForSession(
  regionPackId: RegionPackId | undefined,
  customMatchingAreas: CustomMatchingAreasByLevel | undefined,
  adminDivisionCounts: AdminDivisionCounts | null | undefined,
): readonly number[] {
  if (regionPackHasBundledBoundaries(regionPackId)) {
    return ADMIN_DIVISION_PROBE_LEVELS.filter((level) =>
      Boolean(customMatchingAreas?.[level as MatchingAdminLevel]),
    );
  }

  return ADMIN_DIVISION_PROBE_LEVELS.filter((level) => {
    const category = adminCategoryForProbeLevel(level);
    if (!category) {
      return false;
    }

    return isAdminDivisionCategoryAvailable(
      category,
      adminDivisionCounts,
      regionPackId,
    );
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

function isRegionPackMeasuringBorderSupported(
  kind: MeasuringFromKind,
  regionPackId: RegionPackId | undefined,
): boolean {
  if (!regionPackId) {
    return true;
  }

  const blocked = getRegionPackConfig(regionPackId)?.unsupportedBorders;
  return !blocked?.has(kind);
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

  if (!counts) {
    return false;
  }

  return isAdminDivisionCountAvailable(counts[categoryId]);
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
  if (!isMeasuringAdminBorderKind(kind)) {
    return true;
  }

  if (!isRegionPackMeasuringBorderSupported(kind, regionPackId)) {
    return false;
  }

  switch (kind) {
    case "admin1_border":
      return isAdminDivisionCategoryAvailable(
        "admin_division_1",
        counts,
        regionPackId,
      );
    case "admin2_border":
      return isAdminDivisionCategoryAvailable(
        "admin_division_2",
        counts,
        regionPackId,
      );
    case "admin3_border":
      return isAdminDivisionCategoryAvailable(
        "admin_division_3",
        counts,
        regionPackId,
      );
    case "admin4_border":
      return isAdminDivisionCategoryAvailable(
        "admin_division_4",
        counts,
        regionPackId,
      );
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

export function matchingCategoryAdminLevel(
  categoryId: AdminDivisionMatchingCategory,
): number | null {
  return adminLevelForMatchingCategory(categoryId);
}

export function isBundledAdminRegionPack(
  regionPackId: RegionPackId | undefined,
): boolean {
  return regionPackHasBundledBoundaries(regionPackId);
}
