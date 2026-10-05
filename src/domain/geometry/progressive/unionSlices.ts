import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { PolygonFeature } from "../kernel/types";
import { runUnionPolygonFeatures } from "../kernel/unionKernelRunner";

export const POLYGON_UNION_SLICE_BATCH = 8;

function asPolygonFeature(feature: Feature<Polygon | MultiPolygon>): PolygonFeature {
  return feature as PolygonFeature;
}

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
    const batch = features.slice(i, i + batchSize).map(asPolygonFeature);
    const batchUnion = await runUnionPolygonFeatures(batch);
    if (running && batchUnion) {
      running = await runUnionPolygonFeatures([asPolygonFeature(running), batchUnion]);
    } else {
      running = running ?? batchUnion;
    }
    if (i + batchSize < features.length && yieldFn) {
      await yieldFn();
    }
  }
  return running;
}
