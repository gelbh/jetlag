import { useMemo } from "react";
import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { clusterNearbyPoints } from "../../../domain/session/live/liveMapLocations";
import { isLiveLocationGone } from "../../../domain/session/live/liveLocationFreshness";
import { useLiveLocationNowMs } from "../../../hooks/map/useLiveLocationNowMs";
import { buildLiveClusterPaint } from "../helpers/liveClusterPaint";
import { MapLibrePointMarkers } from "../helpers/MapLibrePointMarkers";
import type { CircleMarkerProps } from "../helpers/mapMarkerFeatures";

interface LivePlayerLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
  role: "seeker" | "hider";
}

export function LivePlayerLocationsLayer({
  locations,
  myUid = null,
  role,
}: LivePlayerLocationsLayerProps) {
  const nowMs = useLiveLocationNowMs();
  const markers = useMemo((): CircleMarkerProps[] => {
    const fresh = locations.filter(
      (location) => !isLiveLocationGone(location.updatedAt, nowMs),
    );
    return clusterNearbyPoints(fresh).map((cluster) => {
      const paint = buildLiveClusterPaint(cluster, role, myUid, nowMs);
      return {
        id: paint.key,
        lat: paint.lat,
        lng: paint.lng,
        radiusPx: paint.radius,
        borderColor: paint.borderColor,
        borderWidth: paint.borderWidth,
        fillColor: paint.fillColor,
        opacity: paint.fillOpacity,
      };
    });
  }, [locations, myUid, nowMs, role]);

  return <MapLibrePointMarkers id="live-players" markers={markers} />;
}
