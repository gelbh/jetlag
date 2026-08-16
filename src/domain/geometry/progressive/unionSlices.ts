import type { Feature, MultiPolygon, Polygon } from "geojson";
import { unionPolygonFeatures } from "../kernel/unionPolygonFeatures";

export const POLYGON_UNION_SLICE_BATCH = 8;

export async function unionPolygonFeaturesInSlices(
  features: readonly Feature<Polygon | MultiPolygon>[],
  options?: { batchSize?: number; yieldFn?: () => Promise<void> },
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const batchSize = options?.batchSize ?? POLYGON_UNION_SLICE_BATCH;
  const yieldFn = options?.yieldFn;

  if (features.length === 0) {
    return null;
  }
  if (features.length === 1) {
    return features[0] ?? null;
  }

  let running: Feature<Polygon | MultiPolygon> | null = null;
  for (let i = 0; i < features.length; i += batchSize) {
    const batch = features.slice(i, i + batchSize);
    const batchUnion = unionPolygonFeatures(batch);
    if (running && batchUnion) {
      running = unionPolygonFeatures([running, batchUnion]);
    } else {
      running = running ?? batchUnion;
    }
    if (i + batchSize < features.length && yieldFn) {
      await yieldFn();
    }
  }
  return running;
}
