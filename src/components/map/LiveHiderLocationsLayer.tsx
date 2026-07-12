import { CircleMarker, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  clusterHiderLocations,
  clusterTooltipLabel,
} from "../../domain/session/liveMapLocations";
import type { PlayerLocationRecord } from "../../domain/session/sessionChat";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

interface LiveHiderLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
}

export function LiveHiderLocationsLayer({
  locations,
  myUid = null,
}: LiveHiderLocationsLayerProps) {
  const clusters = clusterHiderLocations(locations);

  return (
    <>
      {clusters.map((cluster) => {
        const center: LatLngTuple = [cluster.lat, cluster.lng];
        const isSelf =
          myUid !== null && cluster.uids.some((uid) => uid === myUid);
        const count = cluster.members.length;

        return (
          <CircleMarker
            key={cluster.uids.join("-")}
            center={center}
            radius={isSelf ? 10 : 9}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              weight: isSelf ? 3 : 2,
              fillColor: isSelf
                ? MAP_ANNOTATION_COLORS.hidingZoneOwn
                : MAP_ANNOTATION_COLORS.hidingZone,
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              {clusterTooltipLabel(count, "hider")}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
