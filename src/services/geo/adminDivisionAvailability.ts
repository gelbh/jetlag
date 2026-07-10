import type { GameArea } from "../../domain/map/annotations";
import type { CustomMatchingAreasByLevel } from "../../domain/session/sessionCustomContent";
import { adminLevelForMatchingCategory } from "../../domain/questions/matchingQuestions";
import type { MatchingCategoryId } from "../../domain/questions/matchingQuestions";
import type { MeasuringFromKind } from "../../domain/questions/measuringQuestions";
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
): Promise<AdminDivisionCounts> {
  const counts = emptyAdminDivisionCounts();

  await Promise.all(
    ADMIN_DIVISION_PROBE_LEVELS.map(async (level) => {
      const category = adminCategoryForProbeLevel(level);
      if (!category) {
        return;
      }

      const features = await fetchAdminDivisionFeaturesInArea(
        gameArea,
        level,
        customMatchingAreas?.[level],
      );

      counts[category] = features.length;
    }),
  );

  return counts;
}

export function isAdminDivisionCountAvailable(count: number): boolean {
  return count >= MIN_ADMIN_DIVISIONS_FOR_AVAILABILITY;
}

export function isAdminDivisionCategoryAvailable(
  categoryId: MatchingCategoryId,
  counts: AdminDivisionCounts | null | undefined,
): boolean {
  if (!isAdminDivisionMatchingCategory(categoryId)) {
    return true;
  }

  if (!counts) {
    return true;
  }

  return isAdminDivisionCountAvailable(counts[categoryId]);
}

export function measuringBorderKindForAdminCategory(
  categoryId: AdminDivisionMatchingCategory,
): MeasuringFromKind | null {
  switch (categoryId) {
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
): kind is "admin3_border" | "admin4_border" {
  return kind === "admin3_border" || kind === "admin4_border";
}

export function adminBorderKindAvailability(
  kind: MeasuringFromKind,
  counts: AdminDivisionCounts | null | undefined,
): boolean {
  if (kind === "admin3_border") {
    return isAdminDivisionCategoryAvailable("admin_division_3", counts);
  }
  if (kind === "admin4_border") {
    return isAdminDivisionCategoryAvailable("admin_division_4", counts);
  }
  return true;
}

export function adminLevelForMeasuringBorderKind(
  kind: "admin3_border" | "admin4_border",
): number {
  return kind === "admin3_border" ? 8 : 9;
}

export function matchingCategoryAdminLevel(
  categoryId: AdminDivisionMatchingCategory,
): number | null {
  return adminLevelForMatchingCategory(categoryId);
}
