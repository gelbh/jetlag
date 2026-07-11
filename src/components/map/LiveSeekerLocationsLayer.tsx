import { CircleMarker, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { PlayerLocationRecord } from "../../domain/session/sessionChat";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

interface LiveSeekerLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
}

export function LiveSeekerLocationsLayer({
  locations,
  myUid = null,
}: LiveSeekerLocationsLayerProps) {
  return (
    <>
      {locations.map((location) => {
        const center: LatLngTuple = [location.lat, location.lng];
        const isSelf = myUid !== null && location.uid === myUid;

        return (
          <CircleMarker
            key={location.uid}
            center={center}
            radius={isSelf ? 10 : 9}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              weight: isSelf ? 3 : 2,
              fillColor: isSelf
                ? MAP_ANNOTATION_COLORS.userLocation
                : MAP_ANNOTATION_COLORS.seekerLive,
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              {isSelf ? "You" : "Seeker"}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
