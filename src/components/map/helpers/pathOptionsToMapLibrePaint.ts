import type { MapPathOptions } from "../../../domain/map/mapPathOptions";
import type {
  MapLibreFillPaint,
  MapLibreLinePaint,
} from "./MapLibreGeoJsonOverlay";

/** Map Leaflet PathOptions onto MapLibre fill/line paint (no CSS zoom compensation). */
export function pathOptionsToMapLibrePaint(opts: MapPathOptions): {
  fill: MapLibreFillPaint | null;
  line: MapLibreLinePaint | null;
} {
  const fill: MapLibreFillPaint | null = opts.fillColor
    ? {
        fillColor: opts.fillColor,
        fillOpacity: opts.fillOpacity ?? 0.35,
      }
    : null;

  const line: MapLibreLinePaint | null =
    opts.stroke === false
      ? null
      : opts.color
        ? {
            color: opts.color,
            width: opts.weight ?? 1,
            opacity: opts.opacity ?? 1,
          }
        : null;

  return { fill, line };
}
