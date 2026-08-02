import { useCallback, useState } from "react";
import { useMap } from "react-leaflet";
import {
  computeZoomAdaptiveWeight,
  quantizeWeight,
  resolveZoomAdaptiveWeightOptions,
  scaleDashArray,
  type ZoomAdaptiveWeightOptions,
} from "../../domain/map/zoomAdaptiveStrokeWeight";
import { compensateZoomTransformWeight } from "../../domain/map/zoomTransformCompensation";
import { useMapZoomRaf } from "./useMapZoomRaf";
import { useZoomCssScale } from "./useZoomCssScale";

export type { ZoomAdaptiveWeightOptions };
export {
  computeZoomAdaptiveWeight,
  quantizeWeight,
  scaleDashArray,
};

/**
 * Stroke weight that tracks map zoom. State only updates when the
 * quantized (0.5-step) weight changes. Listens to live `zoom` (pinch) as
 * well as `zoomend`.
 */
export function useZoomAdaptiveWeight(
  baseWeight: number,
  options: ZoomAdaptiveWeightOptions = {},
): number {
  const { refZoom, scaleFactor, minWeight, maxWeight } =
    resolveZoomAdaptiveWeightOptions(options);
  const map = useMap();

  const compute = useCallback(
    (zoom: number) =>
      quantizeWeight(
        computeZoomAdaptiveWeight(baseWeight, zoom, {
          refZoom,
          scaleFactor,
          minWeight,
          maxWeight,
        }),
      ),
    [baseWeight, refZoom, scaleFactor, minWeight, maxWeight],
  );

  const [weight, setWeight] = useState(() => compute(map.getZoom()));

  const apply = useCallback(() => {
    const next = compute(map.getZoom());
    setWeight((prev) => (next === prev ? prev : next));
  }, [compute, map]);

  useMapZoomRaf(map, apply);

  return weight;
}

/**
 * Logical adaptive weight with CSS-zoom compensation so stroke stays
 * screen-stable during Leaflet's mid-gesture vector transform.
 */
export function useCompensatedZoomAdaptiveWeight(
  baseWeight: number,
  options: ZoomAdaptiveWeightOptions = {},
): number {
  const logical = useZoomAdaptiveWeight(baseWeight, options);
  const cssScale = useZoomCssScale();
  return compensateZoomTransformWeight(logical, cssScale);
}

/**
 * Current map zoom, but only re-renders when adaptive stroke scale for
 * base weight 1 crosses a 0.5 quantization step (shared by overlay layers).
 */
export function useStrokeScaleZoom(
  options: ZoomAdaptiveWeightOptions = {},
): number {
  const { refZoom, scaleFactor, minWeight, maxWeight } =
    resolveZoomAdaptiveWeightOptions(options);
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  const scaleToken = useCallback(
    (z: number) =>
      quantizeWeight(
        computeZoomAdaptiveWeight(1, z, {
          refZoom,
          scaleFactor,
          minWeight,
          maxWeight,
        }),
      ),
    [refZoom, scaleFactor, minWeight, maxWeight],
  );

  const apply = useCallback(() => {
    const nextZoom = map.getZoom();
    setZoom((prev) =>
      scaleToken(prev) === scaleToken(nextZoom) ? prev : nextZoom,
    );
  }, [map, scaleToken]);

  useMapZoomRaf(map, apply);

  return zoom;
}
