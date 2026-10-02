import type { Feature, MultiPolygon, Polygon } from "geojson";
import { previewGeometryFingerprint } from "../../geometry/measuring/previewGeometryFingerprint";

export function previewEliminationFeaturesFingerprint(
  features: readonly Feature<Polygon | MultiPolygon>[],
): string {
  return features
    .map((feature) => {
      const id =
        typeof feature.id === "string" || typeof feature.id === "number"
          ? String(feature.id)
          : "";
      return `${id}:${previewGeometryFingerprint(feature) ?? "null"}`;
    })
    .join("|");
}
