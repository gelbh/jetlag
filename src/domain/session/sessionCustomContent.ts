import type { LatLngTuple } from "../geometry/geometry";
import type { MatchingCategoryId } from "../questions/matchingQuestions";

export type MatchingAdminLevel = 4 | 6 | 8 | 9;

export interface SessionCustomCategory {
  id: string;
  label: string;
  promptNoun: string;
  overpassSelectors: readonly string[];
}

export interface SessionCustomLocationPin {
  id: string;
  name: string;
  point: LatLngTuple;
}

export type CustomMatchingAreasByLevel = Partial<
  Record<MatchingAdminLevel, string>
>;

export function isSessionCustomCategoryId(
  id: string,
): id is `custom:${string}` {
  return id.startsWith("custom:");
}

export function createSessionCustomCategoryId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `custom:${slug || "category"}`;
}

export function customCategoryAsMatchingId(
  category: SessionCustomCategory,
): MatchingCategoryId {
  return category.id as MatchingCategoryId;
}

export function parseCustomMatchingAreas(
  value: unknown,
): CustomMatchingAreasByLevel | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const parsed: CustomMatchingAreasByLevel = {};
  for (const level of [4, 6, 8, 9] as const) {
    const raw = record[String(level)];
    if (typeof raw === "string" && raw.trim()) {
      parsed[level] = raw;
    }
  }

  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

export function parseCustomCategories(
  value: unknown,
): SessionCustomCategory[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const categories = value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const promptNoun =
      typeof record.promptNoun === "string" ? record.promptNoun.trim() : "";
    const id =
      typeof record.id === "string"
        ? record.id
        : label
          ? createSessionCustomCategoryId(label)
          : "";
    const selectors = Array.isArray(record.overpassSelectors)
      ? record.overpassSelectors.filter(
          (selector): selector is string => typeof selector === "string",
        )
      : [];

    if (!id || !label || !promptNoun || selectors.length === 0) {
      return [];
    }

    return [
      {
        id,
        label,
        promptNoun,
        overpassSelectors: selectors,
      } satisfies SessionCustomCategory,
    ];
  });

  return categories.length > 0 ? categories : undefined;
}

export function parseCustomLocationPins(
  value: unknown,
): SessionCustomLocationPin[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const pins = value.flatMap((item, index) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const id =
      typeof record.id === "string" ? record.id : `custom-pin:${index + 1}`;
    const point = record.point;
    if (
      !name ||
      !Array.isArray(point) ||
      point.length !== 2 ||
      typeof point[0] !== "number" ||
      typeof point[1] !== "number"
    ) {
      return [];
    }

    return [
      {
        id,
        name,
        point: [point[0], point[1]] as LatLngTuple,
      } satisfies SessionCustomLocationPin,
    ];
  });

  return pins.length > 0 ? pins : undefined;
}
