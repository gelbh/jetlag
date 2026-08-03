/** Layer-id prefix for interactive GL markers (queryRenderedFeatures hit-test). */
export const JL_MARKER_LAYER_PREFIX = "jl-marker-";

export function isJlMarkerLayerId(layerId: string): boolean {
  return layerId.startsWith(JL_MARKER_LAYER_PREFIX);
}

export function jlMarkerLayerId(suffix: string): string {
  return `${JL_MARKER_LAYER_PREFIX}${suffix}`;
}

/** Circle layer suffix on a marker overlay source. */
export function markerCircleLayerId(baseId: string): string {
  return `${baseId}-circle`;
}

/** Symbol layer suffix on a marker overlay source. */
export function markerSymbolLayerId(baseId: string): string {
  return `${baseId}-symbol`;
}
