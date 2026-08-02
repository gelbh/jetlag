import { useMemo } from "react";
import { Popup, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import {
  clusterNearbyPoints,
  clusterTooltipLabel,
  locationClusterStableKey,
} from "../../../domain/session/live/liveMapLocations";
import {
  isLiveLocationGone,
  liveClusterPresentation,
} from "../../../domain/session/live/liveLocationFreshness";
import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { useLiveLocationNowMs } from "../../../hooks/map/useLiveLocationNowMs";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";

interface LivePlayerLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
  role: "seeker" | "hider";
  selfFillColor: string;
  otherFillColor: string;
}

export function LivePlayerLocationsLayer({
  locations,
  myUid = null,
  role,
  selfFillColor,
  otherFillColor,
}: LivePlayerLocationsLayerProps) {
  const nowMs = useLiveLocationNowMs();
  const clusters = useMemo(() => {
    const fresh = locations.filter(
      (location) => !isLiveLocationGone(location.updatedAt, nowMs),
    );
    return clusterNearbyPoints(fresh);
  }, [locations, nowMs]);

  return (
    <>
      {clusters.map((cluster) => {
        const center: LatLngTuple = [cluster.lat, cluster.lng];
        const isSelf =
          myUid !== null && cluster.uids.some((uid) => uid === myUid);
        const count = cluster.members.length;
        const { fillOpacity, lastSeenLabel } = liveClusterPresentation(
          cluster.members.map((member) => member.updatedAt),
          nowMs,
        );
        const roleLabel = clusterTooltipLabel(count, role, isSelf);

        return (
          <CompensatedCircleMarker
            key={locationClusterStableKey(cluster)}
            center={center}
            radius={isSelf ? 10 : 9}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              weight: isSelf ? 3 : 2,
              fillColor: isSelf ? selfFillColor : otherFillColor,
              fillOpacity,
              opacity: fillOpacity,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              {roleLabel}
            </Tooltip>
            {lastSeenLabel ? (
              <Popup>
                <div>{roleLabel}</div>
                <div>{lastSeenLabel}</div>
              </Popup>
            ) : null}
          </CompensatedCircleMarker>
        );
      })}
    </>
  );
}
