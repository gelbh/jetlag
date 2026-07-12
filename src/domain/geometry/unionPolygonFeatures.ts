import union from "@turf/union";
import { featureCollection } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";

export type PolygonFeature = Feature<GeoPolygon | MultiPolygon>;

function isPolygonFeature(
  feature: Feature | null | undefined,
): feature is PolygonFeature {
  return (
    feature !== null &&
    feature !== undefined &&
    (feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon")
  );
}

function unionPair(
  left: PolygonFeature,
  right: PolygonFeature,
): PolygonFeature | null {
  const merged = union(featureCollection([left, right]));
  return isPolygonFeature(merged) ? merged : null;
}

/** Unions features in divide-and-conquer order to limit polygon complexity growth. */
export function unionPolygonFeatures(
  features: readonly PolygonFeature[],
): PolygonFeature | null {
  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return features[0] ?? null;
  }

  let layer = features.filter((feature): feature is PolygonFeature => feature != null);

  while (layer.length > 1) {
    const next: PolygonFeature[] = [];

    for (let index = 0; index < layer.length; index += 2) {
      const left = layer[index];
      const right = layer[index + 1];

      if (!left) {
        continue;
      }

      if (!right) {
        next.push(left);
        continue;
      }

      const merged = unionPair(left, right);
      next.push(merged ?? left);
    }

    layer = next;
  }

  return layer[0] ?? null;
}
