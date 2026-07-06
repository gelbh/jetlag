import { CircleMarker, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry";
import type { PlayerLocationRecord } from "../../domain/sessionChat";
import { shortPlayerLabel } from "../../domain/hidingZone";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface LiveSeekerLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
}

export function LiveSeekerLocationsLayer({
  locations,
}: LiveSeekerLocationsLayerProps) {
  return (
    <>
      {locations.map((location) => {
        const center: LatLngTuple = [location.lat, location.lng];

        return (
          <CircleMarker
            key={location.uid}
            center={center}
            radius={9}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              weight: 2,
              fillColor: MAP_ANNOTATION_COLORS.seekerLive,
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              Seeker {shortPlayerLabel(location.uid)}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
