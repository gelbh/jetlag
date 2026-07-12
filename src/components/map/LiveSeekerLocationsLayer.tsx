import { useMemo } from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  clusterSeekerLocations,
  clusterTooltipLabel,
  locationClusterStableKey,
} from "../../domain/session/liveMapLocations";
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
  const clusters = useMemo(
    () => clusterSeekerLocations(locations),
    [locations],
  );

  return (
    <>
      {clusters.map((cluster) => {
        const center: LatLngTuple = [cluster.lat, cluster.lng];
        const isSelf =
          myUid !== null && cluster.uids.some((uid) => uid === myUid);
        const count = cluster.members.length;

        return (
          <CircleMarker
            key={locationClusterStableKey(cluster)}
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
              {clusterTooltipLabel(count, "seeker", isSelf)}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
