/** Zoom-adaptive Leaflet stroke weights for map overlays. */

export interface ZoomAdaptiveWeightOptions {
  /** Zoom level where `baseWeight` is returned unchanged. Default 12. */
  refZoom?: number;
  /** Exponent on (zoom / refZoom). Default 0.75. */
  scaleFactor?: number;
  minWeight?: number;
  maxWeight?: number;
}

const DEFAULT_REF_ZOOM = 12;
const DEFAULT_SCALE_FACTOR = 0.75;
const DEFAULT_MIN_WEIGHT = 0.5;
const DEFAULT_MAX_WEIGHT = 6;
const WEIGHT_STEP = 0.5;

export function resolveZoomAdaptiveWeightOptions(
  options: ZoomAdaptiveWeightOptions = {},
) {
  return {
    refZoom: options.refZoom ?? DEFAULT_REF_ZOOM,
    scaleFactor: options.scaleFactor ?? DEFAULT_SCALE_FACTOR,
    minWeight: options.minWeight ?? DEFAULT_MIN_WEIGHT,
    maxWeight: options.maxWeight ?? DEFAULT_MAX_WEIGHT,
  };
}

/**
 * `clamp(baseWeight * (zoom / refZoom) ^ scaleFactor, minWeight, maxWeight)`
 */
export function computeZoomAdaptiveWeight(
  baseWeight: number,
  zoom: number,
  options: ZoomAdaptiveWeightOptions = {},
): number {
  const { refZoom, scaleFactor, minWeight, maxWeight } =
    resolveZoomAdaptiveWeightOptions(options);
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : refZoom;
  const ratio = safeZoom / refZoom;
  const scaled = baseWeight * ratio ** scaleFactor;
  return Math.min(maxWeight, Math.max(minWeight, scaled));
}

/** Round weight to the nearest 0.5 so SVG path updates stay coarse. */
export function quantizeWeight(weight: number, step = WEIGHT_STEP): number {
  if (!Number.isFinite(weight) || step <= 0) {
    return weight;
  }
  return Math.round(weight / step) * step;
}

/**
 * Scale a Leaflet `dashArray` string with stroke weight
 * (e.g. `"8 6"` at baseWeight 3 → larger/smaller dashes as weight changes).
 */
export function scaleDashArray(
  dashArray: string,
  weight: number,
  baseWeight: number,
): string {
  if (!(baseWeight > 0) || !Number.isFinite(weight)) {
    return dashArray;
  }
  const factor = weight / baseWeight;
  return dashArray
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((part) => {
      const value = Number(part);
      if (!Number.isFinite(value)) {
        return part;
      }
      return String(Math.max(1, Math.round(value * factor)));
    })
    .join(" ");
}
