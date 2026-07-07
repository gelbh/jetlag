import { Polyline } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface ActiveThermometerWalkLayerProps {
  start: LatLngTuple | null;
  livePoint: LatLngTuple | null;
}

export function ActiveThermometerWalkLayer({
  start,
  livePoint,
}: ActiveThermometerWalkLayerProps) {
  if (!start || !livePoint) {
    return null;
  }

  return (
    <Polyline
      positions={[start, livePoint]}
      pathOptions={{
        color: MAP_ANNOTATION_COLORS.thermometerAxis,
        weight: 4,
        dashArray: "8 6",
        opacity: 0.9,
      }}
    />
  );
}
