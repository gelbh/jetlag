import { useMemo } from "react";
import { Popup, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import {
  clusterSeekerLocations,
  clusterTooltipLabel,
  locationClusterStableKey,
} from "../../../domain/session/live/liveMapLocations";
import {
  formatLiveLocationLastSeen,
  isLiveLocationGone,
  liveLocationFillOpacity,
  oldestLiveLocationUpdatedAt,
} from "../../../domain/session/live/liveLocationFreshness";
import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { useFreshnessClock } from "../../../hooks/time/useFreshnessClock";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";

const LIVE_PIN_TICK_MS = 15_000;

interface LiveSeekerLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
}

export function LiveSeekerLocationsLayer({
  locations,
  myUid = null,
}: LiveSeekerLocationsLayerProps) {
  const nowMs = useFreshnessClock(LIVE_PIN_TICK_MS);
  const clusters = useMemo(() => {
    const fresh = locations.filter(
      (location) => !isLiveLocationGone(location.updatedAt, nowMs),
    );
    return clusterSeekerLocations(fresh);
  }, [locations, nowMs]);

  return (
    <>
      {clusters.map((cluster) => {
        const center: LatLngTuple = [cluster.lat, cluster.lng];
        const isSelf =
          myUid !== null && cluster.uids.some((uid) => uid === myUid);
        const count = cluster.members.length;
        const oldestUpdatedAt = oldestLiveLocationUpdatedAt(
          cluster.members.map((member) => member.updatedAt),
        );
        const fillOpacity =
          oldestUpdatedAt === null
            ? 1
            : liveLocationFillOpacity(oldestUpdatedAt, nowMs);
        const lastSeenLabel =
          oldestUpdatedAt === null
            ? null
            : formatLiveLocationLastSeen(oldestUpdatedAt, nowMs);
        const roleLabel = clusterTooltipLabel(count, "seeker", isSelf);

        return (
          <CompensatedCircleMarker
            key={locationClusterStableKey(cluster)}
            center={center}
            radius={isSelf ? 10 : 9}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              weight: isSelf ? 3 : 2,
              fillColor: isSelf
                ? MAP_ANNOTATION_COLORS.userLocation
                : MAP_ANNOTATION_COLORS.seekerLive,
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
