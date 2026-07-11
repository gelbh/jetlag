export type RegionPackId =
  | "dublin"
  | "nyc"
  | "london"
  | "tokyo"
  | "osaka"
  | "zurich"
  | "lucerne";

const REGION_PACK_IDS: readonly RegionPackId[] = [
  "dublin",
  "nyc",
  "london",
  "tokyo",
  "osaka",
  "zurich",
  "lucerne",
] as const;

/** @deprecated Use subregionId on presets. Dublin council ids remain valid subregion values. */
export type DublinCouncilFilter = "dcc" | "fingal" | "sdcc" | "dlr";

export function isRegionPackId(value: unknown): value is RegionPackId {
  return (
    typeof value === "string" &&
    (REGION_PACK_IDS as readonly string[]).includes(value)
  );
}

export function isDublinCouncilFilter(
  value: unknown,
): value is DublinCouncilFilter {
  return (
    value === "dcc" ||
    value === "fingal" ||
    value === "sdcc" ||
    value === "dlr"
  );
}

export function parseRegionPackId(value: unknown): RegionPackId | undefined {
  return isRegionPackId(value) ? value : undefined;
}

export function parseDublinCouncilFilter(
  value: unknown,
): DublinCouncilFilter | undefined {
  return isDublinCouncilFilter(value) ? value : undefined;
}

export function parseSubregionId(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  return value;
}
