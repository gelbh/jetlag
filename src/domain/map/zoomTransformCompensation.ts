/**
 * Leaflet CSS-zooms the vector renderer between path projections.
 * Screen-pixel stroke / CircleMarker sizes must be inverse-scaled so they
 * stay visually stable until zoomend redraws paths.
 */

/** Leaflet `Map.getZoomScale(current, anchor)` for standard CRS (power of two). */
export function cssZoomScale(
  currentZoom: number,
  anchorZoom: number,
): number {
  if (
    !Number.isFinite(currentZoom) ||
    !Number.isFinite(anchorZoom)
  ) {
    return 1;
  }
  return 2 ** (currentZoom - anchorZoom);
}

/** Undo CSS zoom scale on a screen-pixel weight or CircleMarker radius. */
export function compensateZoomTransformWeight(
  logicalWeight: number,
  cssScale: number,
): number {
  if (!Number.isFinite(logicalWeight)) {
    return logicalWeight;
  }
  if (!Number.isFinite(cssScale) || cssScale <= 0) {
    return logicalWeight;
  }
  return logicalWeight / cssScale;
}
