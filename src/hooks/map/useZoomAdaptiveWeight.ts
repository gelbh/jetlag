import { useCallback, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import {
  computeZoomAdaptiveWeight,
  quantizeWeight,
  resolveZoomAdaptiveWeightOptions,
  scaleDashArray,
  type ZoomAdaptiveWeightOptions,
} from "../../domain/map/zoomAdaptiveStrokeWeight";

export type { ZoomAdaptiveWeightOptions };
export {
  computeZoomAdaptiveWeight,
  quantizeWeight,
  scaleDashArray,
};

/**
 * Stroke weight that tracks map zoom. State only updates when the
 * quantized (0.5-step) weight changes.
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

  useMapEvents({
    zoomend: (event) => {
      const next = compute(event.target.getZoom());
      setWeight((prev) => (next === prev ? prev : next));
    },
  });

  return weight;
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

  useMapEvents({
    zoomend: (event) => {
      const nextZoom = event.target.getZoom();
      setZoom((prev) =>
        scaleToken(prev) === scaleToken(nextZoom) ? prev : nextZoom,
      );
    },
  });

  return zoom;
}
