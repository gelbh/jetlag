import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import {
  buildCoarsePolygonFeature,
  refinePolygonFeatureStep,
  type PolygonLodPhase,
} from "@/domain/geometry/progressive/polygonLod";
import { previewGeometryFingerprint } from "@/domain/geometry/measuring/previewGeometryFingerprint";

export function scheduleIdle(callback: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => {
      callback();
    });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 0);
  return () => clearTimeout(id);
}

export function paintPolygonLod(
  full: Feature<GeoPolygon | MultiPolygon>,
  generation: number,
  generationRef: { current: number },
  setFeature: (feature: Feature<GeoPolygon | MultiPolygon> | null) => void,
  setPhase: (phase: PolygonLodPhase) => void,
  cancelRef: { current: (() => void) | null },
): void {
  const coarse = buildCoarsePolygonFeature(full);
  setFeature(coarse);

  if (previewGeometryFingerprint(coarse) === previewGeometryFingerprint(full)) {
    cancelRef.current = null;
    setFeature(full);
    setPhase("complete");
    return;
  }

  setPhase("refining");
  let stepIndex = 0;
  let current = coarse;

  const runStep = () => {
    if (generation !== generationRef.current) {
      return;
    }
    const next = refinePolygonFeatureStep(full, current, stepIndex);
    current = next.feature;
    setFeature(current);
    stepIndex += 1;
    if (next.done) {
      cancelRef.current = null;
      setFeature(full);
      setPhase("complete");
      return;
    }
    cancelRef.current = scheduleIdle(runStep);
  };

  cancelRef.current = scheduleIdle(runStep);
}
