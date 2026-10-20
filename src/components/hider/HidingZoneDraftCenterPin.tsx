import { MapLibreGeoJsonOverlay } from "@/components/map/helpers/MapLibreGeoJsonOverlay";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";

export type HidingZoneDraftCenterPinProps = {
  center: LatLngTuple | null;
  /** Reserved for Task 3 snap travel tween. */
  snapping?: boolean;
  /** Reserved for Task 3 chosen pulse (station id). */
  chosenKey?: string | null;
};

/**
 * Static draft-center marker while placing a hiding zone.
 * Snap travel / chosen pulse land in Task 3 via `snapping` / `chosenKey`.
 */
export function HidingZoneDraftCenterPin({
  center,
  snapping: _snapping,
  chosenKey: _chosenKey,
}: HidingZoneDraftCenterPinProps) {
  if (!center) {
    return null;
  }

  return (
    <MapLibreGeoJsonOverlay
      id="hiding-zone-draft-center-pin"
      data={{
        type: "Point",
        coordinates: [center[1], center[0]],
      }}
      circle={{
        radius: 8,
        color: MAP_ANNOTATION_COLORS.pin,
        strokeColor: "#ffffff",
        strokeWidth: 2,
      }}
    />
  );
}
