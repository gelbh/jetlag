export type RegionPackId = "dublin";

export type DublinCouncilFilter = "dcc" | "fingal" | "sdcc" | "dlr";

export function isRegionPackId(value: unknown): value is RegionPackId {
  return value === "dublin";
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
