import type { Feature } from "geojson";

export function voronoiCellSiteId(
  cell: Feature,
  keys: readonly string[] = ["featureId", "poiId"],
): string | undefined {
  const properties = cell.properties as
    | {
        site?: {
          properties?: Record<string, string | undefined>;
        };
      }
    | null
    | undefined;

  for (const key of keys) {
    const value = properties?.site?.properties?.[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
}
